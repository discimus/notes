import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getNoteImageLayout,
  initNoteImageLayout,
  setNoteImageLayout,
} from '@presentation/app/noteImageLayout.js';
import { appState } from '@presentation/state/AppState.js';

const STORAGE_KEY = 'threadnotes.notes.image-layout';

describe('preferência de layout das imagens', () => {
  beforeEach(() => {
    localStorage.clear();
    appState.set({ noteImageLayout: 'thumbnails' });
  });

  afterEach(() => {
    localStorage.clear();
    appState.set({ noteImageLayout: 'thumbnails' });
  });

  it('usa miniaturas como padrão', () => {
    expect(getNoteImageLayout()).toBe('thumbnails');
  });

  it('persiste e sincroniza o modo coluna com o AppState', () => {
    setNoteImageLayout('column');

    expect(getNoteImageLayout()).toBe('column');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('column');
    expect(appState.get().noteImageLayout).toBe('column');
  });

  it('restaura o modo salvo e ignora valores inválidos', () => {
    localStorage.setItem(STORAGE_KEY, 'column');
    initNoteImageLayout();
    expect(appState.get().noteImageLayout).toBe('column');

    localStorage.setItem(STORAGE_KEY, 'invalido');
    expect(getNoteImageLayout()).toBe('thumbnails');
  });
});
