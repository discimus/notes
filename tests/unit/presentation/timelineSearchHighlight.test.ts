import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import type { AppState } from '@presentation/state/AppState.js';
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

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...appState.get(),
    view: 'timeline',
    chainSummaries: [chain],
    allTags: [],
    timelineSelectedChainIds: ['chain-1'],
    timelineEntries: [
      {
        note: note('text', 'Planejamento inicial'),
        chainId: 'chain-1',
        chainTitle: 'Projeto',
      },
      {
        note: note('code', 'const planejamento = true;', 'code'),
        chainId: 'chain-1',
        chainTitle: 'Projeto',
      },
      {
        note: note('markdown', '# Planejamento\n\nDetalhes', 'markdown'),
        chainId: 'chain-1',
        chainTitle: 'Projeto',
      },
    ],
    timelineTotal: 3,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: {
      query: 'planejamento',
      from: '',
      to: '',
      tagIds: [],
      contentTypes: [],
      tagMode: 'any',
      sort: 'newest',
    },
    timelineIsLoadingMore: false,
    isLoading: false,
    ...overrides,
  };
}

describe('Realce da busca na timeline', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('realça o termo em texto, código e Markdown', () => {
    appState.set(makeState());
    const layout = renderTimelineLayout(makeState());
    const rows = [...layout.querySelectorAll<HTMLElement>('.timeline-entry')];

    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      expect(
        row.querySelectorAll('mark.timeline-search-highlight').length
      ).toBeGreaterThan(0);
    });
    expect(
      rows[2]?.querySelector('h1 mark.timeline-search-highlight')?.textContent
    ).toBe('Planejamento');
  });
});
