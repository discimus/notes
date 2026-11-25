import type { NoteDTO, NoteTagSuggestionDTO, TagDTO } from '../dto/index.js';
import {
  TAG_SUGGESTION_CACHE_TTL_MS,
  type ITagSuggestionCache,
  type TagSuggestionCacheEntry,
} from '../ports/ITagSuggestionCache.js';
import type {
  ITagSuggestionDecisions,
  NoteTagDecision,
} from '../ports/ITagSuggestionDecisions.js';
import type { ITagFeedbackStore, TagFeedbackMap } from '../ports/ITagFeedbackStore.js';
import {
  ALGORITHM_VERSION,
  CATALOG_VERSION,
  DEFAULT_MAX_CONTEXT_NOTES,
  DEFAULT_MAX_NEW_TAGS,
  DEFAULT_SUGGESTION_LIMIT,
  DEFAULT_SUGGESTION_WEIGHTS,
  WEIGHTS_VERSION,
  canonicalTagKey,
  createDefaultTagSuggestionPipeline,
  deriveNoteTitle,
  documentSignature,
  isStandardTagKey,
  preprocessContent,
  TfIdfIndex,
} from '@domain/services/tagSuggestions/index.js';
import type {
  ConsolidatedTagSuggestion,
  PreprocessedDocument,
  TagSuggestionPipeline,
  TagSuggestionWeights,
  TagUsageStats,
} from '@domain/services/tagSuggestions/index.js';
import type { UUID } from '@shared/types/index.js';
import { now } from '@shared/utilities/index.js';
import { MemoryTagSuggestionDecisions } from './decisions.js';

export interface TagSuggestionInput {
  chainId: UUID;
  chainTitle?: string | undefined;
  notes: readonly NoteDTO[];
  availableTags: readonly TagDTO[];
  chainTags: readonly TagDTO[];
  noteIds?: readonly UUID[] | undefined;
}

export interface TagSuggestionResult {
  suggestionsByNoteId: Record<UUID, NoteTagSuggestionDTO[]>;
  generatedNoteIds: UUID[];
}

export interface TagSuggestionConfig {
  limit: number;
  maxNewTags: number;
  maxContextNotes: number;
  weights: TagSuggestionWeights;
}

const DEFAULT_CONFIG: TagSuggestionConfig = Object.freeze({
  limit: DEFAULT_SUGGESTION_LIMIT,
  maxNewTags: DEFAULT_MAX_NEW_TAGS,
  maxContextNotes: DEFAULT_MAX_CONTEXT_NOTES,
  weights: DEFAULT_SUGGESTION_WEIGHTS,
});

interface ChainSuggestionState {
  index: TfIdfIndex;
  documents: Map<UUID, PreprocessedDocument>;
  signatures: Map<UUID, string>;
}

function tagReference(tag: TagDTO): { id: string; name: string; normalizedName: string } {
  return {
    id: tag.id,
    name: tag.name,
    normalizedName: tag.normalizedName,
  };
}

function noteSignature(note: NoteDTO): string {
  return `${documentSignature(note.content, note.contentType, note.sourceFileName)}\u0000${
    note.title ?? ''
  }`;
}

function hashParts(parts: readonly string[]): string {
  let hash = 2166136261;
  const input = parts.join('\u0000');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${input.length}:${(hash >>> 0).toString(36)}`;
}

function feedbackSignature(feedback: TagFeedbackMap): string {
  return Object.keys(feedback)
    .sort()
    .map((key) => {
      const record = feedback[key];
      return `${key}:${record?.accepted ?? 0}:${record?.dismissed ?? 0}:${record?.manual ?? 0}`;
    })
    .join(',');
}

function contextSignature(
  input: TagSuggestionInput,
  notes: readonly NoteDTO[],
  config: TagSuggestionConfig,
  feedback: TagFeedbackMap
): string {
  return hashParts([
    `algorithm:${ALGORITHM_VERSION}`,
    `catalog:${CATALOG_VERSION}`,
    `weights:${WEIGHTS_VERSION}`,
    `w:${config.weights.title},${config.weights.content},${config.weights.related},${config.weights.context}`,
    `maxNew:${config.maxNewTags}`,
    `limit:${config.limit}`,
    `contextNotes:${config.maxContextNotes}`,
    `chain:${input.chainId}`,
    `title:${input.chainTitle ?? ''}`,
    `chainTags:${input.chainTags.map((tag) => canonicalTagKey(tag.name)).sort().join(',')}`,
    `notes:${notes.map((note) => `${note.id}=${noteSignature(note)}`).sort().join(';')}`,
    `tags:${input.availableTags.map((tag) => canonicalTagKey(tag.name)).sort().join(',')}`,
    `feedback:${feedbackSignature(feedback)}`,
  ]);
}

function cacheSuggestions(
  suggestions: readonly ConsolidatedTagSuggestion[]
): TagSuggestionCacheEntry['suggestions'] {
  return suggestions.map((suggestion) => ({
    name: suggestion.name,
    normalizedName: suggestion.normalizedName,
    score: suggestion.score,
    sources: suggestion.sources,
    ...(suggestion.reason ? { reason: suggestion.reason } : {}),
    ...(suggestion.breakdown ? { breakdown: suggestion.breakdown } : {}),
    ...(suggestion.isStandard ? { isStandard: true } : {}),
  }));
}

function decisionSets(decisions: readonly NoteTagDecision[]): {
  accepted: Set<string>;
  dismissed: Set<string>;
} {
  const accepted = new Set<string>();
  const dismissed = new Set<string>();
  decisions.forEach((decision) => {
    const target = decision.decision === 'accepted' ? accepted : dismissed;
    target.add(canonicalTagKey(decision.normalizedName));
  });
  return { accepted, dismissed };
}

function feedbackFor(
  feedback: TagFeedbackMap,
  key: string
): { accepted: number; dismissed: number; manual: number } {
  const record = feedback[key];
  return {
    accepted: record?.accepted ?? 0,
    dismissed: record?.dismissed ?? 0,
    manual: record?.manual ?? 0,
  };
}

function buildTagUsage(
  availableTags: readonly TagDTO[],
  feedback: TagFeedbackMap
): Map<string, TagUsageStats> {
  const usage = new Map<string, TagUsageStats>();

  availableTags.forEach((tag) => {
    const key = canonicalTagKey(tag.name);
    const stats = feedbackFor(feedback, key);
    usage.set(key, {
      chainCount: tag.chainCount,
      noteCount: tag.noteCount ?? 0,
      ...stats,
    });
  });

  Object.keys(feedback).forEach((key) => {
    if (usage.has(key)) return;
    const stats = feedbackFor(feedback, key);
    usage.set(key, {
      chainCount: 0,
      noteCount: 0,
      ...stats,
    });
  });

  return usage;
}

function siblingTagSupport(
  notes: readonly NoteDTO[],
  targetNoteId: UUID
): Map<string, number> {
  const support = new Map<string, number>();
  const siblings = notes.filter((note) => note.id !== targetNoteId);
  if (siblings.length === 0) return support;

  siblings.forEach((note) => {
    const seen = new Set<string>();
    (note.tags ?? []).forEach((tag) => {
      const key = canonicalTagKey(tag.name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      support.set(key, (support.get(key) ?? 0) + 1);
    });
  });

  support.forEach((count, key) => support.set(key, count / siblings.length));
  return support;
}

export class TagSuggestionService {
  private readonly pipeline: TagSuggestionPipeline;
  private readonly config: TagSuggestionConfig;
  private readonly decisions: ITagSuggestionDecisions;
  private readonly feedback: ITagFeedbackStore | null;
  private readonly chains = new Map<string, ChainSuggestionState>();

  constructor(
    private readonly cache: ITagSuggestionCache,
    pipeline?: TagSuggestionPipeline,
    decisions?: ITagSuggestionDecisions,
    feedback?: ITagFeedbackStore | null,
    config?: Partial<TagSuggestionConfig>
  ) {
    this.pipeline = pipeline ?? createDefaultTagSuggestionPipeline();
    this.decisions = decisions ?? new MemoryTagSuggestionDecisions();
    this.feedback = feedback ?? null;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_CONFIG.weights,
        ...(config?.weights ?? {}),
      },
    };
  }

  suggest(input: TagSuggestionInput): TagSuggestionResult {
    const state = this.chainState(input.chainId);
    this.hydrateChain(state, input.notes);

    const feedback = this.feedback?.load() ?? {};
    const chainContext = contextSignature(
      input,
      input.notes,
      this.config,
      feedback
    );
    const usage = buildTagUsage(input.availableTags, feedback);
    const targetIds = input.noteIds ? new Set(input.noteIds) : null;
    const suggestionsByNoteId: Record<UUID, NoteTagSuggestionDTO[]> = {};
    const generatedNoteIds: UUID[] = [];
    const entries: TagSuggestionCacheEntry[] = [];

    for (const note of input.notes) {
      if (targetIds && !targetIds.has(note.id)) continue;

      const noteSig = noteSignature(note);
      let entry = this.cache.load(note.id);
      if (!this.isCacheEntryValid(entry, noteSig, chainContext)) {
        generatedNoteIds.push(note.id);
        const decisions = this.decisions.loadForNote(note.id);
        const decisionKeys = decisionSets(decisions);
        const siblings = input.notes.filter((item) => item.id !== note.id);
        const corpus = siblings
          .slice(0, this.config.maxContextNotes)
          .map((item) => state.documents.get(item.id))
          .filter((document): document is PreprocessedDocument => Boolean(document));
        const title = deriveNoteTitle(note.content, note.title);
        const suggestions = note.content.trim()
          ? this.pipeline.suggest({
              content: note.content,
              ...(title ? { title } : {}),
              ...(note.sourceFileName ? { sourceFileName: note.sourceFileName } : {}),
              ...(input.chainTitle ? { chainTitle: input.chainTitle } : {}),
              corpus,
              tfidfIndex: state.index,
              siblingTagSupport: siblingTagSupport(input.notes, note.id),
              tagUsage: usage,
              context: {
                assignedTagNames: (note.tags ?? []).map((tag) => tag.name),
                chainTagNames: input.chainTags.map((tag) => tag.name),
                availableTags: input.availableTags.map(tagReference),
                acceptedKeys: decisionKeys.accepted,
                dismissedKeys: decisionKeys.dismissed,
                weights: this.config.weights,
                limit: this.config.limit,
                maxNewTags: this.config.maxNewTags,
              },
            })
          : [];
        const updatedAt = now();
        entry = {
          noteId: note.id,
          signature: noteSig,
          suggestions: cacheSuggestions(suggestions),
          acceptedKeys: [...decisionKeys.accepted],
          dismissedKeys: [...decisionKeys.dismissed],
          updatedAt,
          expiresAt: new Date(
            new Date(updatedAt).getTime() + TAG_SUGGESTION_CACHE_TTL_MS
          ).toISOString(),
          contextSignature: chainContext,
          algorithmVersion: ALGORITHM_VERSION,
          catalogVersion: CATALOG_VERSION,
          weightsVersion: WEIGHTS_VERSION,
        };
        entries.push(entry);
      }

      suggestionsByNoteId[note.id] = this.materialize(
        entry,
        input.availableTags,
        note.tags ?? []
      );
    }

    if (entries.length > 0) this.cache.saveMany(entries);
    return { suggestionsByNoteId, generatedNoteIds };
  }

  markAccepted(noteId: UUID, normalizedName: string): void {
    this.markDecision(noteId, 'accepted', normalizedName);
    this.feedback?.record('accepted', canonicalTagKey(normalizedName));
  }

  dismiss(noteId: UUID, normalizedName: string): void {
    this.markDecision(noteId, 'dismissed', normalizedName);
    this.feedback?.record('dismissed', canonicalTagKey(normalizedName));
  }

  markManual(tagName: string): void {
    this.feedback?.record('manual', canonicalTagKey(tagName));
  }

  markAutoAssigned(noteId: UUID, normalizedName: string): void {
    this.markDecision(noteId, 'accepted', normalizedName);
    this.feedback?.record('autoAssigned', canonicalTagKey(normalizedName));
  }

  removeNote(noteId: UUID): void {
    this.decisions.removeForNote(noteId);
    this.cache.remove(noteId);
    this.chains.forEach((state) => {
      state.documents.delete(noteId);
      state.signatures.delete(noteId);
    });
  }

  evictChain(chainId: UUID): void {
    this.chains.delete(chainId);
  }

  private chainState(chainId: UUID): ChainSuggestionState {
    const existing = this.chains.get(chainId);
    if (existing) {
      this.chains.delete(chainId);
      this.chains.set(chainId, existing);
      return existing;
    }
    if (this.chains.size >= 5) {
      const oldest = this.chains.keys().next().value;
      if (oldest) this.chains.delete(oldest);
    }
    const created: ChainSuggestionState = {
      index: new TfIdfIndex(),
      documents: new Map(),
      signatures: new Map(),
    };
    this.chains.set(chainId, created);
    return created;
  }

  private hydrateChain(state: ChainSuggestionState, notes: readonly NoteDTO[]): void {
    const validIds = new Set(notes.map((note) => note.id));

    notes.forEach((note) => {
      const signature = noteSignature(note);
      if (
        state.signatures.get(note.id) === signature &&
        state.index.hasSignature(note.id, signature)
      ) {
        return;
      }
      const document = preprocessContent(note.content);
      state.index.upsert(note.id, signature, document);
      state.documents.set(note.id, document);
      state.signatures.set(note.id, signature);
    });

    state.index.retain(validIds);
    for (const noteId of [...state.documents.keys()]) {
      if (!validIds.has(noteId)) state.documents.delete(noteId);
    }
    for (const noteId of [...state.signatures.keys()]) {
      if (!validIds.has(noteId)) state.signatures.delete(noteId);
    }
  }

  private isCacheEntryValid(
    entry: TagSuggestionCacheEntry | null,
    signature: string,
    context: string
  ): entry is TagSuggestionCacheEntry {
    return Boolean(
      entry &&
        entry.signature === signature &&
        entry.contextSignature === context &&
        entry.algorithmVersion === ALGORITHM_VERSION &&
        entry.catalogVersion === CATALOG_VERSION &&
        entry.weightsVersion === WEIGHTS_VERSION
    );
  }

  private markDecision(
    noteId: UUID,
    decision: 'accepted' | 'dismissed',
    normalizedName: string
  ): void {
    const key = canonicalTagKey(normalizedName);
    this.decisions.record({
      noteId,
      normalizedName: key,
      decision,
      decidedAt: now(),
    });

    const entry = this.cache.load(noteId);
    if (!entry) return;
    const field = decision === 'accepted' ? 'acceptedKeys' : 'dismissedKeys';
    const keys = new Set(entry[field]);
    keys.add(key);
    entry[field] = [...keys];
    entry.updatedAt = now();
    this.cache.save(entry);
  }

  private materialize(
    entry: TagSuggestionCacheEntry,
    availableTags: readonly TagDTO[],
    assignedTags: readonly TagDTO[]
  ): NoteTagSuggestionDTO[] {
    const existing = new Map(
      availableTags.map((tag) => [canonicalTagKey(tag.name), tag])
    );
    const assigned = new Set(assignedTags.map((tag) => canonicalTagKey(tag.name)));
    const decisions = decisionSets(this.decisions.loadForNote(entry.noteId));
    const accepted = new Set([
      ...entry.acceptedKeys.map(canonicalTagKey),
      ...decisions.accepted,
    ]);
    const dismissed = new Set([
      ...entry.dismissedKeys.map(canonicalTagKey),
      ...decisions.dismissed,
    ]);

    return entry.suggestions
      .filter(
        (suggestion) =>
          !assigned.has(suggestion.normalizedName) &&
          !accepted.has(suggestion.normalizedName) &&
          !dismissed.has(suggestion.normalizedName)
      )
      .map((suggestion) => {
        const tag = existing.get(suggestion.normalizedName);
        return {
          noteId: entry.noteId,
          name: tag?.name ?? suggestion.name,
          normalizedName: suggestion.normalizedName,
          score: suggestion.score,
          isNew: !tag,
          ...(tag ? { existingTagId: tag.id } : {}),
          sources: [...suggestion.sources],
          ...(suggestion.reason ? { reason: suggestion.reason } : {}),
          ...(suggestion.breakdown ? { breakdown: suggestion.breakdown } : {}),
          isStandard:
            suggestion.isStandard ?? isStandardTagKey(suggestion.normalizedName),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.limit);
  }
}
