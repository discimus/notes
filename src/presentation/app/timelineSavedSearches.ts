import type { TimelineFilters } from '../state/AppState.js';
import { generateId, now } from '@shared/utilities/index.js';

const STORAGE_KEY = 'threadnotes.timeline.saved-searches';
const MAX_SAVED_SEARCHES = 30;

export interface SavedTimelineSearch {
  id: string;
  name: string;
  filters: TimelineFilters;
  chainIds: string[];
  createdAt: string;
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function normalizeFilters(value: unknown): TimelineFilters {
  const record =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const stringArray = (input: unknown): string[] =>
    Array.isArray(input)
      ? [...new Set(input.filter((item): item is string => typeof item === 'string'))]
      : [];
  const sort =
    record['sort'] === 'oldest' || record['sort'] === 'relevance'
      ? record['sort']
      : 'newest';
  const contentTypes = stringArray(record['contentTypes']).filter(
    (value): value is 'text' | 'code' | 'markdown' =>
      value === 'text' || value === 'code' || value === 'markdown'
  );

  return {
    query: typeof record['query'] === 'string' ? record['query'] : '',
    from: typeof record['from'] === 'string' ? record['from'] : '',
    to: typeof record['to'] === 'string' ? record['to'] : '',
    tagIds: stringArray(record['tagIds']),
    contentTypes,
    tagMode: record['tagMode'] === 'all' ? 'all' : 'any',
    sort,
  };
}

function isSavedTimelineSearch(value: unknown): value is SavedTimelineSearch {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['name'] === 'string' &&
    typeof record['createdAt'] === 'string' &&
    Array.isArray(record['chainIds'])
  );
}

export function getSavedTimelineSearches(): SavedTimelineSearch[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isSavedTimelineSearch)
      .map((item) => ({
        ...item,
        filters: normalizeFilters(item.filters),
        chainIds: item.chainIds.filter(
          (chainId): chainId is string => typeof chainId === 'string'
        ),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_SAVED_SEARCHES);
  } catch {
    return [];
  }
}

function persist(items: SavedTimelineSearch[]): void {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function saveTimelineSearch(
  name: string,
  filters: TimelineFilters,
  chainIds: string[]
): SavedTimelineSearch | null {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return null;

  const item: SavedTimelineSearch = {
    id: generateId(),
    name: trimmed,
    filters: normalizeFilters(filters),
    chainIds: [...new Set(chainIds)],
    createdAt: now(),
  };
  const current = getSavedTimelineSearches().filter(
    (saved) => saved.name.toLocaleLowerCase('pt-BR') !== trimmed.toLocaleLowerCase('pt-BR')
  );
  persist([item, ...current].slice(0, MAX_SAVED_SEARCHES));
  return item;
}

export function deleteTimelineSearch(id: string): void {
  persist(getSavedTimelineSearches().filter((item) => item.id !== id));
}
