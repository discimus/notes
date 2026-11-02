import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';
import { saveTimelineSearch } from '@presentation/app/timelineSavedSearches.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

const note: NoteDTO = {
  id: 'note-1',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  content: 'Planejamento do projeto',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function state() {
  return {
    ...appState.get(),
    view: 'timeline' as const,
    chainSummaries: [chain],
    allTags: [],
    timelineSelectedChainIds: ['chain-1'],
    timelineEntries: [{ note, chainId: 'chain-1', chainTitle: 'Projeto' }],
    timelineTotal: 1,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: {
      query: 'planejamento',
      from: '',
      to: '',
      tagIds: [],
      contentTypes: [],
      tagMode: 'any' as const,
      sort: 'relevance' as const,
    },
    timelineIsLoadingMore: false,
    isLoading: false,
  };
}

describe('Workspace de busca da timeline', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    appState.set(state());
    vi.spyOn(AppController, 'applyTimelineSearch').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'clearTimelineFilters').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('exibe o campo onde o termo foi encontrado', () => {
    const layout = renderTimelineLayout(appState.get());
    expect(layout.querySelector('.timeline-entry__match')?.textContent).toBe(
      'Match em Conteúdo'
    );
  });

  it('abre buscas salvas e aplica uma busca', () => {
    saveTimelineSearch(
      'Planejamento',
      state().timelineFilters,
      ['chain-1']
    );
    const layout = renderTimelineLayout(appState.get());

    layout
      .querySelector<HTMLButtonElement>('#timeline-saved-search')
      ?.click();
    const menu = layout.querySelector<HTMLElement>('.timeline-saved-menu')!;
    expect(menu.hidden).toBe(false);

    menu
      .querySelector<HTMLButtonElement>('.timeline-saved-menu__apply')
      ?.click();

    expect(AppController.applyTimelineSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'planejamento' }),
      ['chain-1']
    );
  });

  it('remove todos os filtros pelo chip de limpar tudo', () => {
    const layout = renderTimelineLayout(appState.get());
    layout
      .querySelector<HTMLButtonElement>('.timeline-active-filter__clear')
      ?.click();

    expect(AppController.clearTimelineFilters).toHaveBeenCalled();
  });

  it('fecha o painel de filtros pelos controles do cabeçalho e rodapé', () => {
    const layout = renderTimelineLayout(appState.get());
    const details = layout.querySelector<HTMLDetailsElement>(
      '#timeline-filters-details'
    )!;

    details.open = true;
    layout
      .querySelector<HTMLButtonElement>('#timeline-filters-close')
      ?.click();
    expect(details.open).toBe(false);

    details.open = true;
    layout
      .querySelector<HTMLButtonElement>('#timeline-filters-done')
      ?.click();
    expect(details.open).toBe(false);
  });
});
