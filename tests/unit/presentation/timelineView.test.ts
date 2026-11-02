import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function note(id: string, content: string): NoteDTO {
  return {
    id,
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    content,
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    ...appState.get(),
    view: 'timeline' as const,
    chainSummaries: [chain],
    allTags: [],
    timelineSelectedChainIds: [],
    timelineEntries: [],
    timelineTotal: 0,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: { query: '', from: '', to: '', tagIds: [] },
    timelineIsLoadingMore: false,
    isLoading: false,
    ...overrides,
  };
}

describe('TimelineView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set(makeState());
    vi.spyOn(AppController, 'updateTimelineSelection').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'updateTimelineFilters').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'clearTimelineFilters').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'seekTimelinePage').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'loadMoreTimeline').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renderiza filtros dinâmicos e seleção de coleções', () => {
    const layout = renderTimelineLayout(makeState());

    expect(layout.querySelector('#timeline-query')).not.toBeNull();
    expect(layout.querySelector('#timeline-slider')).not.toBeNull();
    expect(layout.querySelector('#timeline-chain-selector .chain-selector-item')).not.toBeNull();
    expect(layout.textContent).not.toContain('Ver cronologia');
  });

  it('atualiza a seleção ao clicar em uma coleção', () => {
    const layout = renderTimelineLayout(makeState());
    layout.querySelector<HTMLElement>('[data-chain-id="chain-1"]')?.click();

    expect(AppController.updateTimelineSelection).toHaveBeenCalledWith(['chain-1']);
  });

  it('aplica busca com debounce e período imediatamente', () => {
    vi.useFakeTimers();
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);
    const query = layout.querySelector<HTMLInputElement>('#timeline-query')!;
    const from = layout.querySelector<HTMLInputElement>('#timeline-from')!;

    query.value = 'planejamento';
    query.dispatchEvent(new Event('input', { bubbles: true }));
    expect(AppController.updateTimelineFilters).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      query: 'planejamento',
    });

    from.value = '2026-01-01';
    from.dispatchEvent(new Event('change', { bubbles: true }));
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      from: '2026-01-01',
    });
  });

  it('encaminha o slider e o scroll para o controller', () => {
    const layout = renderTimelineLayout(
      makeState({ timelineTotal: 120, timelinePageIndex: 0 })
    );
    const slider = layout.querySelector<HTMLInputElement>('#timeline-slider')!;
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;

    slider.value = '2';
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    expect(AppController.seekTimelinePage).toHaveBeenCalledWith(2);

    list.dispatchEvent(new Event('scroll'));
    expect(AppController.loadMoreTimeline).toHaveBeenCalled();
  });

  it('renderiza entradas e o estado de fim da timeline', () => {
    const layout = renderTimelineLayout(
      makeState({
        timelineSelectedChainIds: ['chain-1'],
        timelineEntries: [
          { note: note('note-1', 'Primeira nota'), chainId: 'chain-1', chainTitle: 'Projeto' },
          { note: note('note-2', 'Segunda nota'), chainId: 'chain-1', chainTitle: 'Projeto' },
        ],
        timelineTotal: 2,
        timelineLoadedOffset: 0,
      })
    );

    expect(layout.querySelectorAll('.timeline-entry')).toHaveLength(2);
    expect(layout.querySelector('#timeline-page-label')?.textContent).toContain(
      'Página 1 de 1'
    );
    expect(layout.querySelector('#timeline-list')?.textContent).not.toContain(
      'Role para carregar mais'
    );
  });
});
