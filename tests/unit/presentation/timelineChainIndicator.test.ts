import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

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
  position: 0,
  role: 'header',
  content: 'Conteúdo',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

describe('Indicador de cadeia na timeline', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'timeline',
      chainSummaries: [chain],
      allTags: [],
      timelineSelectedChainIds: ['chain-1'],
      timelineEntries: [
        { note, chainId: 'chain-1', chainTitle: chain.displayTitle },
      ],
      timelineTotal: 1,
      timelineLoadedOffset: 0,
      timelinePreviewNoteId: null,
      timelineIsLoadingMore: false,
      isLoading: false,
      timelineFilters: {
        query: '',
        from: '',
        to: '',
        tagIds: [],
        contentTypes: [],
        tagMode: 'any',
        sort: 'newest',
      },
    });
  });

  it('usa um ponto discreto em vez da faixa lateral colorida', () => {
    const layout = renderTimelineLayout(appState.get());
    const row = layout.querySelector<HTMLElement>('[data-note-id="note-1"]')!;

    expect(row.classList.contains('timeline-entry--chain-color')).toBe(false);
    expect(
      row.querySelector('.timeline-entry__chain .timeline-entry__chain-dot')
    ).not.toBeNull();
  });
});
