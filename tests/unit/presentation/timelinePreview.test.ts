import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChainSummaryDTO, NoteDTO, TagDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import type { AppState } from '@presentation/state/AppState.js';
import {
  renderTimelineLayout,
  updateTimelineLayout,
} from '@presentation/views/timeline.js';

const tag: TagDTO = {
  id: 'tag-1',
  name: 'pesquisa',
  normalizedName: 'pesquisa',
  createdAt: '2026-01-01T10:00:00.000Z',
  origin: 'manual',
  chainCount: 1,
};

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
    position: 1,
    role: 'tail',
    content,
    contentType: 'text',
    tags: [tag],
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...appState.get(),
    view: 'timeline',
    chainSummaries: [chain],
    allTags: [tag],
    timelineSelectedChainIds: ['chain-1'],
    timelineEntries: [
      {
        note: note('note-1', 'Primeira nota sobre conteúdo'),
        chainId: 'chain-1',
        chainTitle: 'Projeto',
      },
      {
        note: note('note-2', 'Segunda nota'),
        chainId: 'chain-1',
        chainTitle: 'Projeto',
      },
    ],
    timelineTotal: 2,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: {
      query: 'conteúdo',
      from: '',
      to: '',
      tagIds: [],
      contentTypes: [],
      tagMode: 'any',
      sort: 'newest',
    },
    timelineIsLoadingMore: false,
    timelinePreviewNoteId: null,
    isLoading: false,
    ...overrides,
  };
}

describe('Prévia da timeline', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set(makeState());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('abre a prévia à direita ao clicar na nota e permite fechar', () => {
    const state = makeState();
    appState.set(state);
    const layout = renderTimelineLayout(state);
    document.body.appendChild(layout);

    const preview = layout.querySelector<HTMLElement>('#timeline-preview');
    expect(preview?.hidden).toBe(true);

    layout
      .querySelector<HTMLElement>('[data-note-id="note-1"]')
      ?.click();
    expect(appState.get().timelinePreviewNoteId).toBe('note-1');

    updateTimelineLayout(layout, appState.get());
    const openPreview = layout.querySelector<HTMLElement>('#timeline-preview');
    expect(openPreview?.hidden).toBe(false);
    expect(openPreview?.textContent).toContain('Primeira nota sobre conteúdo');
    expect(openPreview?.textContent).toContain('pesquisa');
    expect(
      openPreview?.querySelector('mark.timeline-search-highlight')?.textContent
    ).toBe('conteúdo');
    expect(
      layout
        .querySelector('[data-note-id="note-1"]')
        ?.classList.contains('timeline-entry--selected')
    ).toBe(true);

    openPreview
      ?.querySelector<HTMLButtonElement>('.timeline-preview__close')
      ?.click();
    expect(appState.get().timelinePreviewNoteId).toBeNull();
    updateTimelineLayout(layout, appState.get());
    expect(layout.querySelector<HTMLElement>('#timeline-preview')?.hidden).toBe(
      true
    );
  });

  it('não abre a prévia ao clicar em link dentro da nota', () => {
    const state = makeState({
      timelineEntries: [
        {
          note: note('note-1', 'Veja https://example.com'),
          chainId: 'chain-1',
          chainTitle: 'Projeto',
        },
      ],
      timelineTotal: 1,
    });
    appState.set(state);
    const layout = renderTimelineLayout(state);

    const link = layout.querySelector<HTMLAnchorElement>('.timeline-entry a');
    link?.addEventListener('click', (event) => event.preventDefault());
    link?.click();
    expect(appState.get().timelinePreviewNoteId).toBeNull();
  });
});
