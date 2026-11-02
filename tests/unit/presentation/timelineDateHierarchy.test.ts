import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainSummaryDTO, TimelineEntryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

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

function makeState() {
  return {
    ...appState.get(),
    view: 'timeline' as const,
    chainSummaries: [chain],
    allTags: [],
    timelineSelectedChainIds: [],
    timelineEntries: [entry(0), entry(1)],
    timelineTotal: 2,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: { query: '', from: '', to: '', tagIds: [] },
    timelineIsLoadingMore: false,
    timelineIsLoadingPrevious: false,
    isLoading: false,
  };
}

describe('Timeline date rows', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set(makeState());
  });

  it('coloca cada label de data em uma row própria do grupo', () => {
    const layout = renderTimelineLayout(makeState());
    const list = layout.querySelector<HTMLElement>('#timeline-list')!;
    const rows = Array.from(
      list.querySelectorAll<HTMLElement>('.timeline-date-row')
    );

    expect(rows).toHaveLength(2);
    rows.forEach((row) => {
      const label = row.querySelector<HTMLElement>('.timeline-date');
      const group = row.parentElement;

      expect(label).not.toBeNull();
      expect(label?.parentElement).toBe(row);
      expect(group?.classList.contains('timeline-date-group')).toBe(true);
      expect(group?.firstElementChild).toBe(row);
    });

    expect(rows[0]?.parentElement).not.toBe(rows[1]?.parentElement);
  });
});
