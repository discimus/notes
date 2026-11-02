import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TagDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

function tag(
  id: string,
  name: string,
  chainCount: number,
  noteCount: number
): TagDTO {
  return {
    id,
    name,
    normalizedName: name,
    createdAt: '2026-01-01T00:00:00.000Z',
    origin: 'manual',
    chainCount,
    noteCount,
  };
}

describe('ordem das tags na timeline', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.spyOn(AppController, 'updateTimelineFilters').mockResolvedValue(
      undefined
    );
  });

  it('ordena por vínculos com notas e coleções', () => {
    const state = {
      ...appState.get(),
      view: 'timeline' as const,
      chainSummaries: [],
      allTags: [
        tag('tag-a', 'alpha', 2, 0),
        tag('tag-b', 'beta', 0, 5),
        tag('tag-c', 'gamma', 1, 1),
        tag('tag-d', 'delta', 3, 0),
      ],
      timelineEntries: [],
      timelineFilters: {
        query: '',
        from: '',
        to: '',
        tagIds: [],
        contentTypes: [],
        tagMode: 'any' as const,
        sort: 'newest' as const,
      },
      isLoading: false,
    };
    appState.set(state);

    const layout = renderTimelineLayout(state);
    const names = [
      ...layout.querySelectorAll<HTMLElement>(
        '#timeline-tag-filter .timeline-tag-filter__chip'
      ),
    ].map((chip) => chip.textContent);

    expect(names).toEqual(['beta', 'delta', 'alpha', 'gamma']);
  });
});
