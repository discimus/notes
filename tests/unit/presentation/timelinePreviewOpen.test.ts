import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
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
  content: 'Planejamento inicial',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

describe('Abrir coleção pela prévia da timeline', () => {
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
      timelinePreviewNoteId: 'note-1',
      timelineIsLoadingMore: false,
      isLoading: false,
      timelineFilters: {
        query: 'planejamento',
        from: '',
        to: '',
        tagIds: [],
        contentTypes: [],
        tagMode: 'any',
        sort: 'newest',
      },
    });
  });

  it('abre a nota com o termo atual da timeline', () => {
    const open = vi
      .spyOn(AppController, 'openTimelineResult')
      .mockResolvedValue(undefined);
    const layout = renderTimelineLayout(appState.get());

    layout
      .querySelector<HTMLButtonElement>('.timeline-preview__actions .btn')
      ?.click();

    expect(open).toHaveBeenCalledWith('chain-1', 'note-1', 'planejamento');
  });
});
