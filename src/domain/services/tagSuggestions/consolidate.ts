import { canonicalTagKey, tagNameFromTerm } from './canonicalize.js';
import type {
  ConsolidatedTagSuggestion,
  ConsolidationContext,
  ExtractedKeyword,
  ExistingTagReference,
} from './types.js';

export interface WeightedKeywords {
  id: string;
  weight: number;
  keywords: ExtractedKeyword[];
}

interface CandidateAccumulator {
  term: string;
  scoreSum: number;
  weightSum: number;
  sources: Set<string>;
}

const DEFAULT_LIMIT = 5;
const EXISTING_TAG_BOOST = 1.15;
const CHAIN_TAG_BOOST = 1.08;
const FILE_NAME_SOURCE = 'filename';
const FILE_NAME_BOOST = 1.1;

function existingTagMap(
  availableTags: readonly ExistingTagReference[]
): Map<string, ExistingTagReference> {
  return new Map(availableTags.map((tag) => [canonicalTagKey(tag.name), tag]));
}

function normalizeKeywords(keywords: readonly ExtractedKeyword[]): ExtractedKeyword[] {
  const max = keywords.reduce((value, keyword) => Math.max(value, keyword.score), 0);
  if (max <= 0) return [];
  return keywords.map((keyword) => ({
    ...keyword,
    score: keyword.score / max,
  }));
}

export function consolidateSuggestions(
  results: readonly WeightedKeywords[],
  context: ConsolidationContext
): ConsolidatedTagSuggestion[] {
  const candidates = new Map<string, CandidateAccumulator>();

  results.forEach((result) => {
    normalizeKeywords(result.keywords).forEach((keyword) => {
      const key = canonicalTagKey(keyword.term);
      if (!key) return;

      const current = candidates.get(key) ?? {
        term: keyword.term,
        scoreSum: 0,
        weightSum: 0,
        sources: new Set<string>(),
      };
      current.scoreSum += keyword.score * result.weight;
      current.weightSum += result.weight;
      current.sources.add(result.id);
      candidates.set(key, current);
    });
  });

  const assigned = new Set(context.assignedTagNames.map(canonicalTagKey));
  const chainTags = new Set(context.chainTagNames.map(canonicalTagKey));
  const existingTags = existingTagMap(context.availableTags);
  const accepted = new Set(
    [...(context.acceptedKeys ?? [])].map(canonicalTagKey)
  );
  const dismissed = new Set(
    [...(context.dismissedKeys ?? [])].map(canonicalTagKey)
  );
  const limit = Math.max(1, context.limit ?? DEFAULT_LIMIT);
  const consolidated: ConsolidatedTagSuggestion[] = [];

  candidates.forEach((candidate, key) => {
    if (assigned.has(key) || accepted.has(key) || dismissed.has(key)) return;

    const existing = existingTags.get(key);
    const name = existing?.name ?? tagNameFromTerm(candidate.term);
    if (!name) return;

    const coverage = 1 + Math.max(0, candidate.sources.size - 1) * 0.08;
    const baseScore = (candidate.scoreSum / Math.max(0.0001, candidate.weightSum)) * coverage;
    const contextBoost = existing
      ? EXISTING_TAG_BOOST
      : chainTags.has(key)
        ? CHAIN_TAG_BOOST
        : 1;
    const fileNameBoost = candidate.sources.has(FILE_NAME_SOURCE)
      ? FILE_NAME_BOOST
      : 1;

    consolidated.push({
      name,
      normalizedName: key,
      score: Math.min(1, baseScore * contextBoost * fileNameBoost),
      isNew: !existing,
      ...(existing ? { existingTagId: existing.id } : {}),
      sources: [...candidate.sources].sort(),
    });
  });

  return consolidated
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
      const aFromFileName = a.sources.includes(FILE_NAME_SOURCE);
      const bFromFileName = b.sources.includes(FILE_NAME_SOURCE);
      if (aFromFileName !== bFromFileName) return aFromFileName ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    })
    .slice(0, limit);
}
