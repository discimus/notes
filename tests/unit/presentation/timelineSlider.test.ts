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

function makeState(overrides: Record<string, unknown> = {}) {
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
    isLoading: false,
    ...overrides,
  };
}

function setListMetrics(
  list: HTMLElement,
  scrollHeight: number,
  clientHeight: number
): void {
  Object.defineProperty(list, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(list, 'clientHeight', {
    value: clientHeight,
    configurable: true,
  });
}

describe('Timeline slider', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set(makeState());
    vi.spyOn(AppController, 'seekTimelinePage').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'loadMoreTimeline').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'loadPreviousTimeline').mockResolvedValue(
      undefined
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('acompanha o scroll em passos de página', () => {
    const state = makeState({
      timelineEntries: Array.from({ length: 100 }, (_, index) =>
        entry(index)
      ),
    });
    appState.set(state);
    const layout = renderTimelineLayout(state);
    document.body.appendChild(layout);
    const slider = layout.querySelector<HTMLInputElement>('#timeline-slider')!;
    const label = layout.querySelector<HTMLElement>('#timeline-page-label')!;
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;

    setListMetrics(list, 1000, 200);
    list.scrollTop = 400;
    list.dispatchEvent(new Event('scroll'));

    expect(slider.step).toBe('1');
    expect(slider.value).toBe('1');
    expect(label.textContent).toContain('Página 2 de 3');
    expect(label.textContent).toContain('·');
    expect(
      label.querySelector('.timeline-slider-date__day')?.textContent
    ).toMatch(/^\d{2}$/);
    expect(
      label.querySelector('.timeline-slider-date__month')?.textContent
    ).toHaveLength(3);
    expect(slider.getAttribute('aria-valuetext')).toBe(label.textContent);
  });

  it('agrupa label e slider na coluna de notas', () => {
    const state = makeState();
    appState.set(state);
    const layout = renderTimelineLayout(state);
    const label = layout.querySelector<HTMLElement>('#timeline-page-label')!;
    const slider = layout.querySelector<HTMLInputElement>('#timeline-slider')!;
    const scrubber = layout.querySelector<HTMLElement>('.timeline-scrubber')!;
    const column = layout.querySelector<HTMLElement>('.timeline-list-column')!;
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;

    expect(scrubber.contains(label)).toBe(true);
    expect(scrubber.contains(slider)).toBe(true);
    expect(scrubber.parentElement).toBe(column);
    expect(list.parentElement).toBe(column);
    expect(scrubber.nextElementSibling).toBe(list);
  });

  it('carrega a página ao mexer no slider e reposiciona a lista', () => {
    vi.useFakeTimers();
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);
    const slider = layout.querySelector<HTMLInputElement>('#timeline-slider')!;
    const label = layout.querySelector<HTMLElement>('#timeline-page-label')!;
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;

    list.scrollTop = 120;
    slider.value = '1';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(label.textContent).toContain('Página 2 de 3');

    vi.advanceTimersByTime(120);

    expect(list.scrollTop).toBe(0);
    expect(AppController.seekTimelinePage).toHaveBeenCalledWith(1);
  });

  it('carrega páginas anteriores ao rolar para cima', () => {
    const state = makeState({
      timelineEntries: Array.from({ length: 20 }, (_, index) =>
        entry(index + 100)
      ),
      timelineLoadedOffset: 100,
      timelinePageIndex: 2,
    });
    appState.set(state);
    const layout = renderTimelineLayout(state);
    document.body.appendChild(layout);
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;

    setListMetrics(list, 1000, 200);
    list.scrollTop = 20;
    list.dispatchEvent(new Event('scroll'));

    expect(AppController.loadPreviousTimeline).toHaveBeenCalled();
  });

  it('mantém o período visível quando há apenas uma página', () => {
    const layout = renderTimelineLayout(
      makeState({
        timelineTotal: 2,
        timelineEntries: [entry(0), entry(1)],
      })
    );
    const slider = layout.querySelector<HTMLInputElement>('#timeline-slider')!;
    const label = layout.querySelector<HTMLElement>('#timeline-page-label')!;
    const row = layout.querySelector<HTMLElement>('.timeline-slider-row')!;

    expect(row.hidden).toBe(false);
    expect(slider.disabled).toBe(true);
    expect(label.textContent).toContain('Página 1 de 1');
  });
});
