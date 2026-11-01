import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ChainSummaryDTO,
  NoteDTO,
  TagDTO,
  TimelineEntryDTO,
} from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import type { AppState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

const tag: TagDTO = {
  id: 'tag-1',
  name: 'pesquisa',
  normalizedName: 'pesquisa',
  createdAt: '2026-01-01T10:00:00.000Z',
  origin: 'manual',
  chainCount: 1,
};

function chain(id: string, title: string): ChainSummaryDTO {
  return {
    id,
    displayTitle: title,
    noteCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
  };
}

function note(id: string, chainId: string, content: string): NoteDTO {
  return {
    id,
    chainId,
    position: 1,
    role: 'tail',
    content,
    contentType: 'text',
    tags: [tag],
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function entry(id: string, chainId: string, title: string): TimelineEntryDTO {
  return {
    note: note(id, chainId, `Conteúdo ${id}`),
    chainId,
    chainTitle: title,
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...appState.get(),
    view: 'timeline' as const,
    chainSummaries: [chain('chain-1', 'Projeto'), chain('chain-2', 'Estudos')],
    allTags: [tag],
    timelineSelectedChainIds: [],
    timelineEntries: [],
    timelineTotal: 0,
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
    isLoading: false,
    ...overrides,
  };
}

describe('Timeline como busca', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(AppController, 'updateTimelineFilters').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'updateTimelineSelection').mockResolvedValue(undefined);
    vi.spyOn(AppController, 'clearTimelineFilters').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('colore notas por cadeia, cria legenda e exibe tags', () => {
    const state = makeState({
      timelineEntries: [
        entry('note-1', 'chain-1', 'Projeto'),
        entry('note-2', 'chain-2', 'Estudos'),
      ],
      timelineTotal: 2,
    });
    appState.set(state);
    const layout = renderTimelineLayout(state);

    const rows = [...layout.querySelectorAll<HTMLElement>('.timeline-entry')];
    expect(rows).toHaveLength(2);

    const firstColor = rows[0]?.style.getPropertyValue('--timeline-chain-accent');
    const secondColor = rows[1]?.style.getPropertyValue('--timeline-chain-accent');

    expect(firstColor).toMatch(/^hsl\(/);
    expect(secondColor).toMatch(/^hsl\(/);
    expect(firstColor).not.toBe(secondColor);
    expect(layout.querySelectorAll('.timeline-legend-item')).toHaveLength(2);
    expect(rows[0]?.querySelector('.timeline-entry__tags')?.textContent).toContain(
      'pesquisa'
    );
    expect(layout.querySelector('#timeline-result-count')?.textContent).toContain(
      '2 notas'
    );
  });

  it('encaminha filtros de tipo, tags, ordenação e escopo', () => {
    const state = makeState({ timelineSelectedChainIds: ['chain-1'] });
    appState.set(state);
    const layout = renderTimelineLayout(state);

    layout
      .querySelector<HTMLElement>('[data-content-type="code"]')
      ?.click();
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      contentTypes: ['code'],
    });

    layout.querySelector<HTMLElement>('[data-tag-mode="all"]')?.click();
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      tagMode: 'all',
    });

    layout.querySelector<HTMLElement>('[data-sort="oldest"]')?.click();
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      sort: 'oldest',
    });

    layout.querySelector<HTMLElement>('#timeline-chain-all')?.click();
    expect(AppController.updateTimelineSelection).toHaveBeenCalledWith([]);
  });

  it('aplica preset de data e remove filtros ativos individualmente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00'));

    const state = makeState({
      timelineSelectedChainIds: ['chain-1'],
      timelineFilters: {
        query: 'projeto',
        from: '',
        to: '',
        tagIds: ['tag-1'],
        contentTypes: ['code'],
        tagMode: 'any',
        sort: 'newest',
      },
    });
    appState.set(state);
    const layout = renderTimelineLayout(state);

    expect(
      layout.querySelector<HTMLDetailsElement>('#timeline-filters-details')
        ?.open
    ).toBe(false);
    expect(layout.querySelector('#timeline-filter-count')?.textContent).toBe('4');

    layout.querySelector<HTMLElement>('[data-date-preset="today"]')?.click();
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      from: '2026-05-10',
      to: '2026-05-10',
    });

    layout
      .querySelector<HTMLElement>('[data-filter-kind="tag"]')
      ?.click();
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      tagIds: [],
    });
  });
});
