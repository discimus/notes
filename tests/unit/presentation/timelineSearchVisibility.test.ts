import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, TimelineEntryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 50,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function entry(index: number): TimelineEntryDTO {
  const createdAt = new Date(
    Date.UTC(2026, 0, 31 - index, 12, 0, 0)
  ).toISOString();
  return {
    chainId: 'chain-1',
    chainTitle: 'Projeto',
    note: {
      id: `note-${index}`,
      chainId: 'chain-1',
      position: index,
      role: 'header',
      content: `Nota ${index}`,
      createdAt,
      updatedAt: createdAt,
    },
  };
}

function makeState() {
  return {
    ...appState.get(),
    view: 'timeline' as const,
    chainSummaries: [chain],
    allTags: [],
    timelineSelectedChainIds: [],
    timelineEntries: Array.from({ length: 50 }, (_, index) => entry(index)),
    timelineTotal: 120,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: { query: '', from: '', to: '', tagIds: [] },
    timelineIsLoadingMore: false,
    timelineIsLoadingPrevious: false,
    isLoading: false,
  };
}

function setListMetrics(list: HTMLElement): void {
  Object.defineProperty(list, 'clientHeight', {
    value: 200,
    configurable: true,
  });
  Object.defineProperty(list, 'scrollHeight', {
    value: 1000,
    configurable: true,
  });
}

describe('Timeline search visibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    const state = makeState();
    appState.set(state);
    vi.spyOn(AppController, 'loadMoreTimeline').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'loadPreviousTimeline').mockResolvedValue(
      undefined
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('esconde a busca ao descer e mostra ao subir', async () => {
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;

    setListMetrics(list);
    await new Promise((resolve) => setTimeout(resolve, 150));

    list.scrollTop = 120;
    list.dispatchEvent(new Event('scroll'));

    await vi.waitFor(() => {
      expect(
        layout.classList.contains('timeline-panel--search-hidden')
      ).toBe(true);
    });

    list.scrollTop = 60;
    list.dispatchEvent(new Event('scroll'));

    await vi.waitFor(() => {
      expect(
        layout.classList.contains('timeline-panel--search-hidden')
      ).toBe(false);
    });
  });

  it('mantém a busca visível enquanto o campo está em foco', async () => {
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;
    const query = layout.querySelector<HTMLInputElement>('#timeline-query')!;

    setListMetrics(list);
    await new Promise((resolve) => setTimeout(resolve, 150));

    query.focus();
    list.scrollTop = 120;
    list.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(
      layout.classList.contains('timeline-panel--search-hidden')
    ).toBe(false);
  });
});
