import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';
import { renderSearchLayout } from '@presentation/views/search.js';
import type { SearchResultDTO } from '@application/dto/index.js';

const result: SearchResultDTO = {
  noteId: 'note-1',
  chainId: 'chain-1',
  chainTitle: 'Coleção 1',
  snippet: 'Resultado 1',
  noteCreatedAt: '2026-01-01T00:00:00.000Z',
  noteRole: 'header',
  matchType: 'content',
};

describe('Carregamento automático da busca', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'search',
      searchQuery: 'resultado',
      searchResults: [result],
      searchLoadedOffset: 1,
      searchHasMore: true,
      searchIsLoadingMore: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('busca a próxima página quando os resultados não preenchem a área', async () => {
    const loadMore = vi
      .spyOn(AppController, 'loadMoreSearch')
      .mockResolvedValue(undefined);
    const layout = renderSearchLayout(appState.get());
    document.body.appendChild(layout);
    const results = layout.querySelector<HTMLElement>('#search-results-list')!;

    Object.defineProperty(results, 'clientHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(results, 'scrollHeight', {
      configurable: true,
      value: 300,
    });

    await Promise.resolve();

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
