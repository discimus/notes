import type { UUID, ISODateString } from '@shared/types/index.js';

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
}

export interface ITagSuggestionCache {
  load(noteId: UUID): TagSuggestionCacheEntry | null;
  save(entry: TagSuggestionCacheEntry): void;
  saveMany(entries: readonly TagSuggestionCacheEntry[]): void;
  remove(noteId: UUID): void;
}
