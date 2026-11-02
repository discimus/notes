import type {
  CachedTagSuggestion,
  ITagSuggestionCache,
  TagSuggestionCacheEntry,
} from '@application/ports/ITagSuggestionCache.js';

export const TAG_SUGGESTION_CACHE_KEY = 'threadnotes.tag-suggestions.v1';
const MAX_ENTRIES = 500;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSuggestion(value: unknown): value is CachedTagSuggestion {
  return (
    isRecord(value) &&
    typeof value['name'] === 'string' &&
    typeof value['normalizedName'] === 'string' &&
    typeof value['score'] === 'number' &&
    isStringArray(value['sources'])
  );
}

function isEntry(value: unknown): value is TagSuggestionCacheEntry {
  return (
    isRecord(value) &&
    typeof value['noteId'] === 'string' &&
    typeof value['signature'] === 'string' &&
    Array.isArray(value['suggestions']) &&
    value['suggestions'].every(isSuggestion) &&
    isStringArray(value['acceptedKeys']) &&
    isStringArray(value['dismissedKeys']) &&
    typeof value['updatedAt'] === 'string'
  );
}

function cloneEntry(entry: TagSuggestionCacheEntry): TagSuggestionCacheEntry {
  return {
    ...entry,
    suggestions: entry.suggestions.map((suggestion) => ({
      ...suggestion,
      sources: [...suggestion.sources],
    })),
    acceptedKeys: [...entry.acceptedKeys],
    dismissedKeys: [...entry.dismissedKeys],
  };
}

export class LocalTagSuggestionCache implements ITagSuggestionCache {
  private readonly entries: Map<string, TagSuggestionCacheEntry>;

  constructor(private readonly target: Storage | null = storage()) {
    this.entries = this.restore();
  }

  load(noteId: string): TagSuggestionCacheEntry | null {
    const entry = this.entries.get(noteId);
    return entry ? cloneEntry(entry) : null;
  }

  save(entry: TagSuggestionCacheEntry): void {
    this.saveMany([entry]);
  }

  saveMany(entries: readonly TagSuggestionCacheEntry[]): void {
    entries.forEach((entry) => {
      this.entries.set(entry.noteId, cloneEntry(entry));
    });
    this.prune();
    this.persist();
  }

  remove(noteId: string): void {
    if (!this.entries.delete(noteId)) return;
    this.persist();
  }

  private restore(): Map<string, TagSuggestionCacheEntry> {
    const restored = new Map<string, TagSuggestionCacheEntry>();
    if (!this.target) return restored;

    try {
      const raw = this.target.getItem(TAG_SUGGESTION_CACHE_KEY);
      if (!raw) return restored;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) return restored;

      Object.values(parsed).forEach((value) => {
        if (isEntry(value)) restored.set(value.noteId, cloneEntry(value));
      });
    } catch {
      return restored;
    }

    return restored;
  }

  private prune(): void {
    if (this.entries.size <= MAX_ENTRIES) return;
    const ordered = [...this.entries.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    ordered.slice(MAX_ENTRIES).forEach((entry) => this.entries.delete(entry.noteId));
  }

  private persist(): void {
    if (!this.target) return;
    const payload = Object.fromEntries(
      [...this.entries.entries()].map(([noteId, entry]) => [noteId, cloneEntry(entry)])
    );

    try {
      this.target.setItem(TAG_SUGGESTION_CACHE_KEY, JSON.stringify(payload));
    } catch {
      return;
    }
  }
}
