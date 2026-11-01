import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@presentation/pages/render.js';
import { appState } from '@presentation/state/AppState.js';

const STORAGE_KEY = 'threadnotes.notes.image-layout';

describe('shell — layout das imagens', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, 'column');
    document.body.innerHTML = '<div id="app"></div>';
    appState.set({
      view: 'chains',
      selectedChainId: null,
      chainSummaries: [],
      currentChain: null,
      chainFilterQuery: '',
      drawerOpen: false,
      isLoading: false,
      error: null,
      noteImageLayout: 'thumbnails',
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    localStorage.clear();
    appState.set({ noteImageLayout: 'thumbnails' });
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('aplica e remove a classe global do modo coluna', () => {
    const root = document.getElementById('app') as HTMLElement;
    renderApp(root);

    const shell = root.querySelector<HTMLElement>('.app-shell')!;
    expect(shell.classList.contains('app-shell--image-column')).toBe(true);

    appState.set({ noteImageLayout: 'thumbnails' });

    expect(shell.classList.contains('app-shell--image-column')).toBe(false);
  });
});
