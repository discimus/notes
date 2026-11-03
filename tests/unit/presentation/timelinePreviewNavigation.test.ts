import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ChainSummaryDTO,
  NoteDTO,
  TimelineEntryDTO,
} from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import type { AppState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import {
  renderTimelineLayout,
  updateTimelineLayout,
} from '@presentation/views/timeline.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function note(id: string): NoteDTO {
  return {
    id,
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    content: `Conteudo ${id}`,
    contentType: 'text',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function entry(id: string): TimelineEntryDTO {
  return {
    note: note(id),
    chainId: 'chain-1',
    chainTitle: 'Projeto',
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...appState.get(),
    view: 'timeline',
    chainSummaries: [chain],
    allTags: [],
    timelineSelectedChainIds: ['chain-1'],
    timelineEntries: [entry('note-1'), entry('note-2'), entry('note-3')],
    timelineTotal: 3,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: {
      query: '',
      from: '',
      to: '',
      tagIds: [],
      contentTypes: [],
      tagMode: 'any',
      sort: 'newest',
    },
    timelineIsLoadingMore: false,
    timelineIsLoadingPrevious: false,
    timelinePreviewNoteId: 'note-2',
    isLoading: false,
    ...overrides,
  };
}

function navButton(
  layout: HTMLElement,
  direction: 'previous' | 'next'
): HTMLButtonElement {
  const button = layout.querySelector<HTMLButtonElement>(
    `[data-preview-nav="${direction}"]`
  );
  if (!button) throw new Error(`Botao ${direction} nao encontrado`);
  return button;
}

describe('Timeline - navegacao na previa da nota', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('navega entre entradas ja carregadas', () => {
    appState.set(makeState());
    const layout = renderTimelineLayout(appState.get());
    document.body.appendChild(layout);

    expect(navButton(layout, 'previous').disabled).toBe(false);
    expect(navButton(layout, 'next').disabled).toBe(false);

    const list = layout.querySelector<HTMLElement>('#timeline-list')!;
    const nextRow = layout.querySelector<HTMLElement>(
      '[data-note-id="note-3"]'
    )!;
    Object.defineProperty(list, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    list.getBoundingClientRect = () =>
      ({ top: 0, bottom: 200, left: 0, right: 600, width: 600, height: 200 }) as DOMRect;
    nextRow.getBoundingClientRect = () =>
      ({ top: 500, bottom: 580, left: 0, right: 600, width: 600, height: 80 }) as DOMRect;

    navButton(layout, 'next').click();
    expect(appState.get().timelinePreviewNoteId).toBe('note-3');

    updateTimelineLayout(layout, appState.get());
    expect(
      layout.querySelector('#timeline-preview')?.textContent
    ).toContain('Conteudo note-3');
    expect(document.activeElement).toBe(nextRow);
    expect(list.scrollTop).toBe(388);

    navButton(layout, 'previous').click();
    expect(appState.get().timelinePreviewNoteId).toBe('note-2');
  });

  it('carrega a proxima pagina ao chegar ao fim das entradas', async () => {
    appState.set(
      makeState({
        timelineEntries: [entry('note-1'), entry('note-2')],
        timelineTotal: 3,
        timelineLoadedOffset: 0,
        timelinePreviewNoteId: 'note-2',
      })
    );
    const loadMore = vi
      .spyOn(AppController, 'loadMoreTimeline')
      .mockImplementation(async () => {
        const current = appState.get();
        appState.set({
          timelineEntries: [...current.timelineEntries, entry('note-3')],
          timelineTotal: 3,
          timelineLoadedOffset: 0,
        });
      });

    const layout = renderTimelineLayout(appState.get());
    document.body.appendChild(layout);

    expect(navButton(layout, 'next').disabled).toBe(false);
    navButton(layout, 'next').click();

    await vi.waitFor(() => {
      expect(appState.get().timelinePreviewNoteId).toBe('note-3');
    });
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('carrega a pagina anterior ao chegar ao inicio das entradas', async () => {
    appState.set(
      makeState({
        timelineEntries: [entry('note-2'), entry('note-3')],
        timelineTotal: 3,
        timelineLoadedOffset: 1,
        timelinePreviewNoteId: 'note-2',
      })
    );
    const loadPrevious = vi
      .spyOn(AppController, 'loadPreviousTimeline')
      .mockImplementation(async () => {
        const current = appState.get();
        appState.set({
          timelineEntries: [entry('note-1'), ...current.timelineEntries],
          timelineTotal: 3,
          timelineLoadedOffset: 0,
        });
      });

    const layout = renderTimelineLayout(appState.get());
    document.body.appendChild(layout);

    expect(navButton(layout, 'previous').disabled).toBe(false);
    navButton(layout, 'previous').click();

    await vi.waitFor(() => {
      expect(appState.get().timelinePreviewNoteId).toBe('note-1');
    });
    expect(loadPrevious).toHaveBeenCalledTimes(1);
  });
});
