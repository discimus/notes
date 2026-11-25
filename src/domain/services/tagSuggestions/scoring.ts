import { DEFAULT_SUGGESTION_LIMIT, DEFAULT_SUGGESTION_WEIGHTS } from './config.js';
import {
  findStandardTagForTerm,
  standardTagByKey,
  type StandardTagDefinition,
} from './catalog.js';
import { canonicalTagKey, tagNameFromTerm } from './canonicalize.js';
import type {
  ConsolidatedTagSuggestion,
  ConsolidationContext,
  ExtractedKeyword,
  ExistingTagReference,
  ScoreBreakdown,
  SuggestionField,
  TagUsageStats,
} from './types.js';

export interface WeightedKeywords {
  id: string;
  weight: number;
  keywords: ExtractedKeyword[];
}

interface RawCandidate {
  key: string;
  term: string;
  titleSum: number;
  titleWeight: number;
  contentSum: number;
  contentWeight: number;
  sources: Set<string>;
}

interface TargetCandidate {
  key: string;
  name: string;
  existing?: ExistingTagReference | undefined;
  standard?: StandardTagDefinition | undefined;
  mappedFromSpecific: boolean;
  titleSum: number;
  titleWeight: number;
  contentSum: number;
  contentWeight: number;
  sources: Set<string>;
  sourceKeys: Set<string>;
}

const EXISTING_TAG_BOOST = 1.15;
const CATALOG_MAPPING_BOOST = 1.15;
const CATALOG_DIRECT_BOOST = 1.05;
const FILE_NAME_BOOST = 1.1;
const MAX_USAGE_BOOST = 0.25;
const MAX_FEEDBACK_MULTIPLIER = 1.25;
const MIN_FEEDBACK_MULTIPLIER = 0.75;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function fieldFor(keyword: ExtractedKeyword): SuggestionField {
  return keyword.field ?? 'content';
}

function normalizedKeywords(keywords: readonly ExtractedKeyword[]): ExtractedKeyword[] {
  const max = keywords.reduce((value, keyword) => Math.max(value, keyword.score), 0);
  if (max <= 0) return [];
  return keywords.map((keyword) => ({
    ...keyword,
    score: keyword.score / max,
  }));
}

function addRawCandidate(
  candidates: Map<string, RawCandidate>,
  keyword: ExtractedKeyword,
  extractorId: string,
  extractorWeight: number
): void {
  const key = canonicalTagKey(keyword.term);
  if (!key) return;

  const entry = candidates.get(key) ?? {
    key,
    term: keyword.term,
    titleSum: 0,
    titleWeight: 0,
    contentSum: 0,
    contentWeight: 0,
    sources: new Set<string>(),
  };
  const field = fieldFor(keyword);
  const weighted = keyword.score * extractorWeight;

  if (field === 'title') {
    entry.titleSum += weighted;
    entry.titleWeight += extractorWeight;
  } else {
    entry.contentSum += weighted;
    entry.contentWeight += extractorWeight;
  }
  entry.sources.add(extractorId);
  candidates.set(key, entry);
}

function existingTagMap(
  availableTags: readonly ExistingTagReference[]
): Map<string, ExistingTagReference> {
  return new Map(availableTags.map((tag) => [canonicalTagKey(tag.name), tag]));
}

function targetFor(
  candidate: RawCandidate,
  existingTags: Map<string, ExistingTagReference>,
  allowCatalogMapping: boolean
): TargetCandidate {
  const existing = existingTags.get(candidate.key);
  if (existing) {
    return {
      key: candidate.key,
      name: existing.name,
      existing,
      standard: standardTagByKey(candidate.key) ?? undefined,
      mappedFromSpecific: false,
      titleSum: 0,
      titleWeight: 0,
      contentSum: 0,
      contentWeight: 0,
      sources: new Set<string>(),
      sourceKeys: new Set<string>([candidate.key]),
    };
  }

  const affinity = allowCatalogMapping
    ? findStandardTagForTerm(candidate.term)
    : null;
  if (affinity) {
    const targetExisting = existingTags.get(affinity.tag.key);
    return {
      key: affinity.tag.key,
      name: targetExisting?.name ?? affinity.tag.name,
      ...(targetExisting ? { existing: targetExisting } : {}),
      standard: affinity.tag,
      mappedFromSpecific: affinity.tag.key !== candidate.key,
      titleSum: 0,
      titleWeight: 0,
      contentSum: 0,
      contentWeight: 0,
      sources: new Set<string>(),
      sourceKeys: new Set<string>([candidate.key, affinity.tag.key]),
    };
  }

  return {
    key: candidate.key,
    name: tagNameFromTerm(candidate.term),
    standard: standardTagByKey(candidate.key) ?? undefined,
    mappedFromSpecific: false,
    titleSum: 0,
    titleWeight: 0,
    contentSum: 0,
    contentWeight: 0,
    sources: new Set<string>(),
    sourceKeys: new Set<string>([candidate.key]),
  };
}

function mergeInto(
  targets: Map<string, TargetCandidate>,
  candidate: RawCandidate,
  target: TargetCandidate,
  mappingWeight: number
): void {
  const entry = targets.get(target.key) ?? target;
  const titleAverage =
    candidate.titleWeight > 0 ? candidate.titleSum / candidate.titleWeight : 0;
  const contentAverage =
    candidate.contentWeight > 0 ? candidate.contentSum / candidate.contentWeight : 0;

  entry.titleSum += titleAverage * mappingWeight;
  entry.titleWeight += 1;
  entry.contentSum += contentAverage * mappingWeight;
  entry.contentWeight += 1;
  candidate.sources.forEach((source) => entry.sources.add(source));
  target.sourceKeys.forEach((sourceKey) => entry.sourceKeys.add(sourceKey));
  if (target.mappedFromSpecific) entry.sources.add('catalog');
  targets.set(target.key, entry);
}

function supportFor(
  map: ReadonlyMap<string, number> | undefined,
  keys: Iterable<string>
): number {
  if (!map) return 0;
  let best = 0;
  for (const key of keys) {
    best = Math.max(best, map.get(key) ?? 0);
  }
  return clamp(best, 0, 1);
}

function chainTitleMatch(
  chainTitleTerms: ReadonlySet<string>,
  target: TargetCandidate
): number {
  if (chainTitleTerms.size === 0) return 0;
  const words = new Set<string>();
  target.key.split('-').forEach((word) => words.add(word));
  target.sourceKeys.forEach((key) => key.split('-').forEach((word) => words.add(word)));
  if (words.size === 0) return 0;
  let matches = 0;
  words.forEach((word) => {
    if (chainTitleTerms.has(word)) matches += 1;
  });
  return clamp(matches / words.size, 0, 1);
}

function usageFor(
  usage: ReadonlyMap<string, TagUsageStats> | undefined,
  target: TargetCandidate
): TagUsageStats | undefined {
  if (!usage) return undefined;
  const direct = usage.get(target.key);
  if (direct) return direct;
  for (const key of target.sourceKeys) {
    const found = usage.get(key);
    if (found) return found;
  }
  return undefined;
}

function feedbackMultiplier(stats: TagUsageStats | undefined): number {
  if (!stats) return 1;
  const value =
    1 +
    0.08 * Math.log1p(stats.accepted) +
    0.04 * Math.log1p(stats.manual) -
    0.12 * Math.log1p(stats.dismissed);
  return clamp(value, MIN_FEEDBACK_MULTIPLIER, MAX_FEEDBACK_MULTIPLIER);
}

function tokenCount(key: string): number {
  return key.split('-').filter(Boolean).length;
}

function reasonFor(
  target: TargetCandidate,
  breakdown: ScoreBreakdown,
  usage: TagUsageStats | undefined
): string {
  if (target.existing) {
    const total = usage?.noteCount ?? 0;
    return total > 0
      ? `Tag existente usada em ${total} ${total === 1 ? 'nota' : 'notas'}`
      : 'Tag existente reutilizada';
  }
  if (target.standard) {
    return target.mappedFromSpecific
      ? `Relacionada a ${target.standard.name}`
      : `Tag padrão ${target.standard.name}`;
  }
  if (breakdown.title >= breakdown.content && breakdown.title >= breakdown.related) {
    return 'Termo relevante no título';
  }
  if (breakdown.related >= breakdown.content && breakdown.related >= breakdown.context) {
    return 'Frequente nesta coleção';
  }
  if (breakdown.context > 0 && breakdown.context >= breakdown.content) {
    return 'Combina com o contexto da coleção';
  }
  return 'Termo relevante no conteúdo';
}

function scoreTarget(
  target: TargetCandidate,
  context: ConsolidationContext,
  maxTitle: number,
  maxContent: number,
  chainTags: ReadonlySet<string>,
  chainTitleTerms: ReadonlySet<string>
): ConsolidatedTagSuggestion {
  const weights = context.weights ?? DEFAULT_SUGGESTION_WEIGHTS;
  const titleAverage =
    target.titleWeight > 0 ? target.titleSum / target.titleWeight : 0;
  const contentAverage =
    target.contentWeight > 0 ? target.contentSum / target.contentWeight : 0;
  const title = maxTitle > 0 ? titleAverage / maxTitle : 0;
  const content = maxContent > 0 ? contentAverage / maxContent : 0;
  const relatedTerm = supportFor(context.relatedTermSupport, target.sourceKeys);
  const siblingTag = supportFor(context.siblingTagSupport, target.sourceKeys);
  const related = clamp(0.6 * relatedTerm + 0.4 * siblingTag, 0, 1);
  const chainMatch =
    chainTags.has(target.key) ||
    [...target.sourceKeys].some((key) => chainTags.has(key));
  const titleMatch = chainTitleMatch(chainTitleTerms, target);
  const contextScore = clamp(
    Math.max(chainMatch ? 1 : 0, 0.7 * titleMatch, 0.5 * siblingTag),
    0,
    1
  );
  const breakdown: ScoreBreakdown = {
    title,
    content,
    related,
    context: contextScore,
  };
  const usage = usageFor(context.tagUsage, target);
  const base =
    weights.title * title +
    weights.content * content +
    weights.related * related +
    weights.context * contextScore;

  const usageBoost = usage
    ? 1 + Math.min(MAX_USAGE_BOOST, 0.08 * Math.log1p(usage.noteCount))
    : 1;
  const catalogBoost = target.standard
    ? target.mappedFromSpecific
      ? CATALOG_MAPPING_BOOST
      : CATALOG_DIRECT_BOOST
    : 1;
  const isNew = !target.existing;
  const specificity = isNew
    ? Math.pow(0.92, Math.max(0, tokenCount(target.key) - 1))
    : 1;
  const rarityPenalty =
    isNew && title === 0 && relatedTerm < 0.34 ? 0.9 : 1;
  const fileNameBoost = target.sources.has('filename') ? FILE_NAME_BOOST : 1;
  const score = clamp(
    base *
      (target.existing ? EXISTING_TAG_BOOST : 1) *
      usageBoost *
      catalogBoost *
      specificity *
      rarityPenalty *
      fileNameBoost *
      feedbackMultiplier(usage),
    0,
    1
  );

  return {
    name: target.name,
    normalizedName: target.key,
    score,
    isNew,
    ...(target.existing ? { existingTagId: target.existing.id } : {}),
    sources: [...target.sources].sort(),
    reason: reasonFor(target, breakdown, usage),
    breakdown,
    isStandard: Boolean(target.standard),
  };
}

export function scoreAndConsolidateSuggestions(
  results: readonly WeightedKeywords[],
  context: ConsolidationContext
): ConsolidatedTagSuggestion[] {
  const raw = new Map<string, RawCandidate>();

  results.forEach((result) => {
    normalizedKeywords(result.keywords).forEach((keyword) =>
      addRawCandidate(raw, keyword, result.id, result.weight)
    );
  });

  const assigned = new Set(context.assignedTagNames.map(canonicalTagKey));
  const accepted = new Set([...(context.acceptedKeys ?? [])].map(canonicalTagKey));
  const dismissed = new Set([...(context.dismissedKeys ?? [])].map(canonicalTagKey));
  const existingTags = existingTagMap(context.availableTags);
  const targets = new Map<string, TargetCandidate>();

  raw.forEach((candidate) => {
    if (assigned.has(candidate.key) || accepted.has(candidate.key) || dismissed.has(candidate.key)) {
      return;
    }

    const target = targetFor(
      candidate,
      existingTags,
      !candidate.sources.has('filename')
    );
    const mappingWeight = target.mappedFromSpecific ? 0.95 : 1;
    mergeInto(targets, candidate, target, mappingWeight);
  });

  const candidates = [...targets.values()];
  const maxTitle = candidates.reduce(
    (max, candidate) =>
      Math.max(max, candidate.titleWeight > 0 ? candidate.titleSum / candidate.titleWeight : 0),
    0
  );
  const maxContent = candidates.reduce(
    (max, candidate) =>
      Math.max(max, candidate.contentWeight > 0 ? candidate.contentSum / candidate.contentWeight : 0),
    0
  );
  const chainTags = new Set(context.chainTagNames.map(canonicalTagKey));
  const chainTitleTerms = new Set(context.chainTitleTerms ?? []);
  const limit = Math.max(1, context.limit ?? DEFAULT_SUGGESTION_LIMIT);
  const maxNewTags =
    context.maxNewTags === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, context.maxNewTags);

  const scored = candidates
    .map((candidate) =>
      scoreTarget(candidate, context, maxTitle, maxContent, chainTags, chainTitleTerms)
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
      if (Boolean(a.isStandard) !== Boolean(b.isStandard)) {
        return a.isStandard ? -1 : 1;
      }
      const aFileName = a.sources.includes('filename');
      const bFileName = b.sources.includes('filename');
      if (aFileName !== bFileName) return aFileName ? -1 : 1;
      const aTokens = tokenCount(a.normalizedName);
      const bTokens = tokenCount(b.normalizedName);
      if (aTokens !== bTokens) return aTokens - bTokens;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const selected: ConsolidatedTagSuggestion[] = [];
  let newCount = 0;
  for (const suggestion of scored) {
    if (suggestion.isNew) {
      if (newCount >= maxNewTags) continue;
      newCount += 1;
    }
    selected.push(suggestion);
    if (selected.length >= limit) break;
  }

  return selected;
}
