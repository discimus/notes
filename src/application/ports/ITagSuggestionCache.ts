import type { UUID, ISODateString } from '@shared/types/index.js';

export const TAG_SUGGESTION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedTagSuggestion {
  name: string;
  normalizedName: string;
  score: number;
  sources: string[];
}

export interface TagSuggestionCacheEntry {
  noteId: UUID;
  signature: string;
  suggestions: CachedTagSuggestion[];
  acceptedKeys: string[];
  dismissedKeys: string[];
  updatedAt: ISODateString;
  expiresAt: ISODateString;
}

export interface ITagSuggestionCache {
  load(noteId: UUID): TagSuggestionCacheEntry | null;
  save(entry: TagSuggestionCacheEntry): void;
  saveMany(entries: readonly TagSuggestionCacheEntry[]): void;
  remove(noteId: UUID): void;
}
