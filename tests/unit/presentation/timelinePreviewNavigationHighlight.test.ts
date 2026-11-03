import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  ChainSummaryDTO,
  NoteDTO,
  TimelineEntryDTO,
} from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import type { AppState } from '@presentation/state/AppState.js';
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

function makeState(): AppState {
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

describe('Timeline - realce padronizado da navegacao da previa', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('aplica o mesmo realce transitorio ao item focado', () => {
    appState.set(makeState());
    const layout = renderTimelineLayout(appState.get());
    document.body.appendChild(layout);

    navButton(layout, 'next').click();
    updateTimelineLayout(layout, appState.get());

    const third = layout.querySelector<HTMLElement>(
      '[data-note-id="note-3"]'
    )!;
    expect(third.classList.contains('timeline-entry--preview-focus')).toBe(true);
    expect(document.activeElement).toBe(third);

    navButton(layout, 'previous').click();
    updateTimelineLayout(layout, appState.get());

    const second = layout.querySelector<HTMLElement>(
      '[data-note-id="note-2"]'
    )!;
    expect(second.classList.contains('timeline-entry--preview-focus')).toBe(
      true
    );
    expect(third.classList.contains('timeline-entry--preview-focus')).toBe(
      false
    );
  });
});
