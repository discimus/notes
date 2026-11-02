import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO, TagDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto principal',
  noteCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function tag(index: number): TagDTO {
  return {
    id: `tag-${index}`,
    name: `tag-${index}`,
    normalizedName: `tag-${index}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    origin: 'manual',
    chainCount: 1,
  };
}

const note: NoteDTO = {
  id: 'note-1',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  content: 'const resultado = true;',
  contentType: 'code',
  tags: [tag(1), tag(2), tag(3), tag(4), tag(5)],
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

describe('Timeline card redesign', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'timeline',
      chainSummaries: [chain],
      allTags: [tag(1), tag(2), tag(3), tag(4), tag(5)],
      timelineSelectedChainIds: ['chain-1'],
      timelineEntries: [
        { note, chainId: 'chain-1', chainTitle: 'Projeto principal' },
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
    vi.spyOn(AppController, 'navigateTo').mockResolvedValue(undefined);
  });

  it('usa hierarquia de card com topo, conteúdo e metadados', () => {
    const layout = renderTimelineLayout(appState.get());
    const row = layout.querySelector<HTMLElement>('[data-note-id="note-1"]')!;

    expect(row.querySelector('.timeline-entry__top')).not.toBeNull();
    expect(row.querySelector('.timeline-entry__chain')?.textContent).toContain(
      'Projeto principal'
    );
    const time = row.querySelector('.timeline-entry__time');
    expect(time?.getAttribute('datetime')).toBe(note.createdAt);
    expect(time?.textContent).toMatch(/^\d{2}:\d{2}$/);
    expect(row.querySelector('.timeline-entry__content')).not.toBeNull();
    expect(row.querySelector('.timeline-entry__type')?.textContent).toBe(
      'Código'
    );
    expect(row.querySelector('.timeline-entry__open')?.textContent).toBe(
      'chevron_right'
    );
  });

  it('limita tags visíveis e resume as restantes', () => {
    const layout = renderTimelineLayout(appState.get());
    const tags = layout.querySelector('.timeline-entry__tags')!;

    expect(tags.querySelectorAll('.chip')).toHaveLength(4);
    expect(tags.querySelector('.timeline-entry__tag-more')?.textContent).toBe(
      '+2'
    );
    expect(
      tags.querySelector('.timeline-entry__tag-more')?.getAttribute('aria-label')
    ).toContain('tag-4, tag-5');
  });

  it('mantém o clique na coleção separado da abertura da prévia', () => {
    const layout = renderTimelineLayout(appState.get());
    layout.querySelector<HTMLButtonElement>('.timeline-entry__chain')?.click();

    expect(AppController.navigateTo).toHaveBeenCalledWith('editor', 'chain-1');
    expect(appState.get().timelinePreviewNoteId).toBeNull();
  });
});
