import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@presentation/pages/render.js';
import { setFullNoteContent } from '@presentation/app/noteContentDisplay.js';
import { appState } from '@presentation/state/AppState.js';

describe('conteúdo completo das notas na interface', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    appState.set({
      view: 'chains',
      drawerOpen: false,
      compactMode: false,
      fullNoteContent: false,
      isLoading: false,
      error: null,
    });
  });

  it('aplica e remove a classe do shell conforme a preferência', async () => {
    localStorage.setItem('threadnotes.notes.full-content', 'true');
    const root = document.getElementById('app') as HTMLElement;

    renderApp(root);

    const shell = root.querySelector<HTMLElement>('.app-shell');
    expect(shell?.classList.contains('app-shell--full-note-content')).toBe(true);
    expect(appState.get().fullNoteContent).toBe(true);

    setFullNoteContent(false);

    await vi.waitFor(() => {
      expect(shell?.classList.contains('app-shell--full-note-content')).toBe(false);
    });
    expect(localStorage.getItem('threadnotes.notes.full-content')).toBe('false');
  });
});
