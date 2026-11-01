import { beforeEach, describe, expect, it } from 'vitest';
import {
  getFullNoteContent,
  initNoteContentDisplay,
  setFullNoteContent,
} from '@presentation/app/noteContentDisplay.js';
import { appState } from '@presentation/state/AppState.js';

describe('exibição do conteúdo das notas', () => {
  beforeEach(() => {
    localStorage.clear();
    appState.set({ fullNoteContent: false });
  });

  it('inicia desativada e persiste a preferência', () => {
    expect(getFullNoteContent()).toBe(false);

    setFullNoteContent(true);
    expect(getFullNoteContent()).toBe(true);
    expect(appState.get().fullNoteContent).toBe(true);
    expect(localStorage.getItem('threadnotes.notes.full-content')).toBe('true');

    setFullNoteContent(false);
    expect(getFullNoteContent()).toBe(false);
    expect(appState.get().fullNoteContent).toBe(false);
    expect(localStorage.getItem('threadnotes.notes.full-content')).toBe('false');
  });

  it('inicializa o AppState a partir do localStorage', () => {
    localStorage.setItem('threadnotes.notes.full-content', 'true');

    initNoteContentDisplay();

    expect(appState.get().fullNoteContent).toBe(true);
  });

  it('usa o padrão quando o valor salvo é inválido', () => {
    localStorage.setItem('threadnotes.notes.full-content', 'sim');

    expect(getFullNoteContent()).toBe(false);
  });
});
