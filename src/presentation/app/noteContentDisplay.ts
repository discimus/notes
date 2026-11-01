import { appState } from '../state/AppState.js';

const STORAGE_KEY = 'threadnotes.notes.full-content';

export function getFullNoteContent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setFullNoteContent(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    appState.set({ fullNoteContent: value });
    return;
  }
  appState.set({ fullNoteContent: value });
}

export function initNoteContentDisplay(): void {
  appState.set({ fullNoteContent: getFullNoteContent() });
}
