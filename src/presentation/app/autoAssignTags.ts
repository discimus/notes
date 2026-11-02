import { appState } from '../state/AppState.js';

const STORAGE_KEY = 'threadnotes.auto-assign-tags';

export function getAutoAssignTags(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoAssignTags(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {}
  appState.set({ autoAssignTagsEnabled: value });
}

export function initAutoAssignTags(): void {
  appState.set({ autoAssignTagsEnabled: getAutoAssignTags() });
}
