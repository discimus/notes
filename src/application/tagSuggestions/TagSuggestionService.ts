import type { NoteDTO, NoteTagSuggestionDTO, TagDTO } from '../dto/index.js';
import {
  TAG_SUGGESTION_CACHE_TTL_MS,
  type ITagSuggestionCache,
  type TagSuggestionCacheEntry,
} from '../ports/ITagSuggestionCache.js';
import {
  canonicalTagKey,
  createDefaultTagSuggestionPipeline,
  documentSignature,
  preprocessContent,
  TfIdfIndex,
} from '@domain/services/tagSuggestions/index.js';
import type {
  ConsolidatedTagSuggestion,
  TagSuggestionPipeline,
} from '@domain/services/tagSuggestions/index.js';
import type { UUID } from '@shared/types/index.js';
import { now } from '@shared/utilities/index.js';

export interface TagSuggestionInput {
  chainId: UUID;
  notes: readonly NoteDTO[];
  availableTags: readonly TagDTO[];
  chainTags: readonly TagDTO[];
  noteIds?: readonly UUID[] | undefined;
}

export interface TagSuggestionResult {
  suggestionsByNoteId: Record<UUID, NoteTagSuggestionDTO[]>;
  generatedNoteIds: UUID[];
}

const SUGGESTION_LIMIT = 5;

function tagReference(tag: TagDTO): { id: string; name: string; normalizedName: string } {
  return {
    id: tag.id,
    name: tag.name,
    normalizedName: tag.normalizedName,
  };
}

function cacheSuggestions(
  suggestions: readonly ConsolidatedTagSuggestion[]
): TagSuggestionCacheEntry['suggestions'] {
  return suggestions.map((suggestion) => ({
    name: suggestion.name,
    normalizedName: suggestion.normalizedName,
    score: suggestion.score,
    sources: suggestion.sources,
  }));
}

export class TagSuggestionService {
  private readonly pipeline: TagSuggestionPipeline;
  private readonly indexes = new Map<string, TfIdfIndex>();

  constructor(
    private readonly cache: ITagSuggestionCache,
    pipeline?: TagSuggestionPipeline
  ) {
    this.pipeline = pipeline ?? createDefaultTagSuggestionPipeline();
  }

  suggest(input: TagSuggestionInput): TagSuggestionResult {
    const index = this.indexes.get(input.chainId) ?? new TfIdfIndex();
    this.indexes.set(input.chainId, index);
    const targetIds = input.noteIds ? new Set(input.noteIds) : null;
    const suggestionsByNoteId: Record<UUID, NoteTagSuggestionDTO[]> = {};
    const generatedNoteIds: UUID[] = [];
    const entries: TagSuggestionCacheEntry[] = [];

    for (const note of input.notes) {
      if (targetIds && !targetIds.has(note.id)) continue;

      const signature = documentSignature(
        note.content,
        note.contentType,
        note.sourceFileName
      );
      if (!index.hasSignature(note.id, signature)) {
        index.upsert(note.id, signature, preprocessContent(note.content));
      }

      let entry = this.cache.load(note.id);
      if (!entry || entry.signature !== signature) {
        generatedNoteIds.push(note.id);
        const suggestions = note.content.trim()
          ? this.pipeline.suggest({
              content: note.content,
              ...(note.sourceFileName
                ? { sourceFileName: note.sourceFileName }
                : {}),
              tfidfIndex: index,
              context: {
                assignedTagNames: (note.tags ?? []).map((tag) => tag.name),
                chainTagNames: input.chainTags.map((tag) => tag.name),
                availableTags: input.availableTags.map(tagReference),
                limit: SUGGESTION_LIMIT,
              },
            })
          : [];
        const updatedAt = now();
        entry = {
          noteId: note.id,
          signature,
          suggestions: cacheSuggestions(suggestions),
          acceptedKeys: [],
          dismissedKeys: [],
          updatedAt,
          expiresAt: new Date(
            new Date(updatedAt).getTime() + TAG_SUGGESTION_CACHE_TTL_MS
          ).toISOString(),
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
    this.markDecision(noteId, 'acceptedKeys', normalizedName);
  }

  dismiss(noteId: UUID, normalizedName: string): void {
    this.markDecision(noteId, 'dismissedKeys', normalizedName);
  }

  private markDecision(
    noteId: UUID,
    field: 'acceptedKeys' | 'dismissedKeys',
    normalizedName: string
  ): void {
    const entry = this.cache.load(noteId);
    if (!entry) return;

    const keys = new Set(entry[field]);
    keys.add(normalizedName);
    entry[field] = [...keys];
    entry.updatedAt = now();
    this.cache.save(entry);
  }

  private materialize(
    entry: TagSuggestionCacheEntry,
    availableTags: readonly TagDTO[],
    assignedTags: readonly TagDTO[]
  ): NoteTagSuggestionDTO[] {
    const existing = new Map(availableTags.map((tag) => [canonicalTagKey(tag.name), tag]));
    const assigned = new Set(assignedTags.map((tag) => canonicalTagKey(tag.name)));
    const accepted = new Set(entry.acceptedKeys);
    const dismissed = new Set(entry.dismissedKeys);

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
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, SUGGESTION_LIMIT);
  }

}
