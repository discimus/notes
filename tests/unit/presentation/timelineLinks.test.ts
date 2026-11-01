import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function note(
  id: string,
  content: string,
  contentType?: NoteDTO['contentType']
): NoteDTO {
  return {
    id,
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    content,
    contentType,
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
    timelineSelectedChainIds: ['chain-1'],
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

describe('Timeline — links padronizados', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('usa o mesmo link mínimo em texto, código e Markdown', () => {
    const layout = renderTimelineLayout(
      makeState({
        timelineEntries: [
          {
            note: note('text', 'Veja https://example.com'),
            chainId: 'chain-1',
            chainTitle: 'Projeto',
          },
          {
            note: note('code', 'const url = "https://example.com";', 'code'),
            chainId: 'chain-1',
            chainTitle: 'Projeto',
          },
          {
            note: note('markdown', '[link](https://example.com)', 'markdown'),
            chainId: 'chain-1',
            chainTitle: 'Projeto',
          },
        ],
        timelineTotal: 3,
        timelineLoadedOffset: 0,
      })
    );

    const entries = [...layout.querySelectorAll<HTMLElement>('.timeline-entry')];
    expect(entries).toHaveLength(3);

    expect(entries[0]?.querySelector('.note-link')?.getAttribute('href')).toBe(
      'https://example.com/'
    );
    expect(
      entries[1]?.querySelector('.timeline-entry__text--code .note-link')
    ).not.toBeNull();
    expect(
      entries[2]?.querySelector(
        '.timeline-entry__text--markdown.note-markdown a.note-link'
      )
    ).not.toBeNull();
    expect(layout.querySelector('.chain-note__link-icon')).toBeNull();
  });
});
