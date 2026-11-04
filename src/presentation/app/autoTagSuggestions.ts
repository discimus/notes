import { appState } from '../state/AppState.js';

const STORAGE_KEY = 'threadnotes.tag-suggestions-enabled';

export function getAutoTagSuggestions(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setAutoTagSuggestions(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {}

  appState.set({
    tagSuggestionsEnabled: value,
    ...(value ? {} : { tagSuggestionsByNoteId: {} }),
  });
}

export function initAutoTagSuggestions(): void {
  appState.set({ tagSuggestionsEnabled: getAutoTagSuggestions() });
}
