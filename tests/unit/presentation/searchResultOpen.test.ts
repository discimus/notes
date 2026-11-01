import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';
import { renderSearchLayout } from '@presentation/views/search.js';
import type { SearchResultDTO } from '@application/dto/index.js';

const result: SearchResultDTO = {
  noteId: 'note-1',
  chainId: 'chain-1',
  chainTitle: 'Cadeia 1',
  snippet: 'Resultado 1',
  noteCreatedAt: '2026-01-01T00:00:00.000Z',
  noteRole: 'header',
  matchType: 'content',
};

function rect(top: number): DOMRect {
  return {
    top,
    bottom: top,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

describe('Abertura de resultado da busca', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'search',
      searchQuery: 'resultado',
      searchResults: [result],
      searchSelectedNoteId: null,
      searchLoadedOffset: 1,
      searchHasMore: false,
      searchIsLoadingMore: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('realça o card, posiciona no topo e abre a nota no editor', () => {
    const open = vi
      .spyOn(AppController, 'openSearchResult')
      .mockResolvedValue(undefined);
    const layout = renderSearchLayout(appState.get());
    document.body.appendChild(layout);
    const container = layout.querySelector<HTMLElement>('#search-results-list')!;
    const item = container.querySelector<HTMLElement>('.search-result')!;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect(0));
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(rect(120));

    item.click();

    expect(item.classList.contains('search-result--selected')).toBe(true);
    expect(item.getAttribute('aria-current')).toBe('true');
    expect(container.scrollTop).toBe(120);
    expect(appState.get().searchSelectedNoteId).toBe('note-1');
    expect(open).toHaveBeenCalledWith('chain-1', 'note-1');
  });

  it('restaura o card selecionado no topo ao voltar para a busca', async () => {
    appState.set({ searchSelectedNoteId: 'note-1' });
    const layout = renderSearchLayout(appState.get());
    document.body.appendChild(layout);
    const container = layout.querySelector<HTMLElement>('#search-results-list')!;
    const item = container.querySelector<HTMLElement>('.search-result')!;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect(0));
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(rect(120));

    await Promise.resolve();

    expect(item.classList.contains('search-result--selected')).toBe(true);
    expect(container.scrollTop).toBe(120);
  });
});
