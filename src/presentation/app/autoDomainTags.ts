import { appState } from '../state/AppState.js';

const STORAGE_KEY = 'threadnotes.auto-domain-tags';

export function getAutoDomainTags(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setAutoDomainTags(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {}

  appState.set({ autoDomainTagsEnabled: value });
}

export function initAutoDomainTags(): void {
  appState.set({ autoDomainTagsEnabled: getAutoDomainTags() });
}
