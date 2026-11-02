import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainSummaryDTO, TimelineEntryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import {
  renderTimelineLayout,
  updateTimelineLayout,
} from '@presentation/views/timeline.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 5,
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
    timelineEntries: Array.from({ length: 5 }, (_, index) => entry(index)),
    timelineTotal: 5,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: { query: '', from: '', to: '', tagIds: [] },
    timelineIsLoadingMore: false,
    timelineIsLoadingPrevious: false,
    isLoading: false,
    timelinePreviewNoteId: null,
    ...overrides,
  };
}

describe('Timeline preview scroll stability', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set(makeState());
  });

  it('carrega apenas o preview e mantém a listagem estática', () => {
    const state = makeState();
    const layout = renderTimelineLayout(state);
    document.body.appendChild(layout);
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;
    const preview = layout.querySelector<HTMLElement>('#timeline-preview')!;
    const row = list.querySelector<HTMLElement>('[data-note-id="note-2"]')!;

    list.scrollTop = 500;
    updateTimelineLayout(
      layout,
      makeState({ timelinePreviewNoteId: 'note-2' })
    );

    expect(preview.hidden).toBe(false);
    expect(list.scrollTop).toBe(500);
    expect(list.querySelector('[data-note-id="note-2"]')).toBe(row);
    expect(row.classList.contains('timeline-entry--selected')).toBe(true);
    expect(row.getAttribute('aria-current')).toBe('true');

    updateTimelineLayout(
      layout,
      makeState({ timelinePreviewNoteId: null })
    );

    expect(preview.hidden).toBe(true);
    expect(list.scrollTop).toBe(500);
    expect(list.querySelector('[data-note-id="note-2"]')).toBe(row);
    expect(row.classList.contains('timeline-entry--selected')).toBe(false);
  });

  it('fecha o preview apenas ao clicar na área da listagem', () => {
    const state = makeState({ timelinePreviewNoteId: 'note-2' });
    appState.set(state);
    const layout = renderTimelineLayout(state);
    document.body.appendChild(layout);
    const preview = layout.querySelector<HTMLElement>('#timeline-preview')!;
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;

    expect(preview.hidden).toBe(false);

    preview.click();
    expect(appState.get().timelinePreviewNoteId).toBe('note-2');

    layout.querySelector<HTMLElement>('.timeline-panel__header')!.click();
    expect(appState.get().timelinePreviewNoteId).toBe('note-2');

    list.click();
    expect(appState.get().timelinePreviewNoteId).toBeNull();
  });
});
