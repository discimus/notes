import { appState } from '../state/AppState.js';

const STORAGE_KEY = 'threadnotes.compact-mode';

export function getCompactMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCompactMode(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    return;
  }
}

export function initCompactMode(): void {
  appState.set({ compactMode: getCompactMode() });
}

export function updateCompactMode(value: boolean): void {
  setCompactMode(value);
  appState.set({ compactMode: value });
}

export function toggleCompactMode(): boolean {
  const next = !appState.get().compactMode;
  updateCompactMode(next);
  return next;
}
