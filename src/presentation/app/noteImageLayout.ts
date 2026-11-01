import { appState } from '../state/AppState.js';

export type NoteImageLayout = 'thumbnails' | 'column';

const STORAGE_KEY = 'threadnotes.notes.image-layout';

function isNoteImageLayout(value: unknown): value is NoteImageLayout {
  return value === 'thumbnails' || value === 'column';
}

export function getNoteImageLayout(): NoteImageLayout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isNoteImageLayout(stored) ? stored : 'thumbnails';
  } catch {
    return 'thumbnails';
  }
}

export function setNoteImageLayout(value: NoteImageLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    appState.set({ noteImageLayout: value });
    return;
  }
  appState.set({ noteImageLayout: value });
}

export function initNoteImageLayout(): void {
  appState.set({ noteImageLayout: getNoteImageLayout() });
}
