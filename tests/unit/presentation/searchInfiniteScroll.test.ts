import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';
import {
  renderSearchLayout,
  updateSearchLayout,
} from '@presentation/views/search.js';
import type { SearchResultDTO } from '@application/dto/index.js';

function result(index: number): SearchResultDTO {
  return {
    noteId: `note-${index}`,
    chainId: `chain-${index}`,
    chainTitle: `Coleção ${index}`,
    snippet: `Resultado ${index}`,
    noteCreatedAt: '2026-01-01T00:00:00.000Z',
    noteRole: 'header',
    matchType: 'content',
  };
}

describe('Busca com scroll infinito', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'search',
      searchQuery: 'resultado',
      searchResults: [result(1), result(2)],
      searchLoadedOffset: 2,
      searchHasMore: true,
      searchIsLoadingMore: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pede mais resultados ao chegar perto do fim da lista', () => {
    const loadMore = vi
      .spyOn(AppController, 'loadMoreSearch')
      .mockResolvedValue(undefined);
    const layout = renderSearchLayout(appState.get());
    const results = layout.querySelector<HTMLElement>('#search-results-list')!;

    Object.defineProperty(results, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(results, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    results.scrollTop = 100;
    results.dispatchEvent(new Event('scroll'));
    expect(loadMore).not.toHaveBeenCalled();

    results.scrollTop = 500;
    results.dispatchEvent(new Event('scroll'));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('invalida a busca atual ao limpar o campo', () => {
    const clearSearch = vi
      .spyOn(AppController, 'clearSearch')
      .mockImplementation(() => undefined);
    const layout = renderSearchLayout(appState.get());

    layout.querySelector<HTMLButtonElement>('#search-clear')!.click();

    expect(clearSearch).toHaveBeenCalledTimes(1);
  });

  it('anexa novos resultados sem recriar os cards ja exibidos', () => {
    const layout = renderSearchLayout(appState.get());
    const firstCard = layout.querySelector('.search-result');

    appState.set({
      searchResults: [result(1), result(2), result(3)],
      searchLoadedOffset: 3,
      searchIsLoadingMore: true,
    });
    updateSearchLayout(layout, appState.get());

    expect(layout.querySelectorAll('.search-result')).toHaveLength(3);
    expect(layout.querySelector('.search-result')).toBe(firstCard);
    expect(layout.querySelector('.search-results__loading')?.textContent).toBe(
      'Carregando mais…'
    );
  });
});
