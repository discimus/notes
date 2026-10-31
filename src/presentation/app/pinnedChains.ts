import { appState } from '../state/AppState.js';

const STORAGE_KEY = 'threadnotes.pinned-chains';

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getPinnedChainIds(): string[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.filter((value): value is string => typeof value === 'string'))];
  } catch {
    return [];
  }
}

export function initPinnedChains(): void {
  appState.set({ pinnedChainIds: getPinnedChainIds() });
}

export function togglePinnedChain(chainId: string): boolean {
  const current = appState.get().pinnedChainIds;
  const pinned = current.includes(chainId);
  const next = pinned
    ? current.filter((id) => id !== chainId)
    : [...current, chainId];

  const storage = getStorage();
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return pinned;
  }

  appState.set({ pinnedChainIds: next });
  return !pinned;
}
