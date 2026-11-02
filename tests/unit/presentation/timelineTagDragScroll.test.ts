import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TagDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderTimelineLayout } from '@presentation/views/timeline.js';

const tags: TagDTO[] = ['um', 'dois', 'tres'].map((name, index) => ({
  id: `tag-${index + 1}`,
  name,
  normalizedName: name,
  createdAt: '2026-01-01T00:00:00.000Z',
  origin: 'manual',
  chainCount: 1,
}));

function makeState() {
  return {
    ...appState.get(),
    view: 'timeline' as const,
    chainSummaries: [],
    allTags: tags,
    timelineSelectedChainIds: [],
    timelineEntries: [],
    timelineTotal: 0,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: { query: '', from: '', to: '', tagIds: [] },
    timelineIsLoadingMore: false,
    isLoading: false,
  };
}

function pointer(type: string, clientX: number): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY: 20,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  return event;
}

function setSize(
  element: HTMLElement,
  clientWidth: number,
  scrollWidth: number
): void {
  Object.defineProperty(element, 'clientWidth', {
    value: clientWidth,
    configurable: true,
  });
  Object.defineProperty(element, 'scrollWidth', {
    value: scrollWidth,
    configurable: true,
  });
}

describe('Timeline tag drag scroll', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set(makeState());
    vi.spyOn(AppController, 'updateTimelineFilters').mockResolvedValue(
      undefined
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('arrasta as tags e atrai para o ponto mais próximo', async () => {
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);
    const filter = layout.querySelector<HTMLElement>('#timeline-tag-filter')!;
    const chips = Array.from(
      filter.querySelectorAll<HTMLElement>('.timeline-tag-filter__chip')
    );

    setSize(filter, 200, 600);
    chips.forEach((chip, index) => {
      Object.defineProperty(chip, 'offsetLeft', {
        value: index * 100,
        configurable: true,
      });
    });

    filter.dispatchEvent(pointer('pointerdown', 150));
    window.dispatchEvent(pointer('pointermove', 50));

    expect(filter.scrollLeft).toBe(100);
    expect(filter.classList.contains('timeline-tag-filter--dragging')).toBe(
      true
    );

    window.dispatchEvent(pointer('pointerup', 50));

    const suppressedClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    chips[0]?.dispatchEvent(suppressedClick);
    expect(suppressedClick.defaultPrevented).toBe(true);
    expect(AppController.updateTimelineFilters).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(filter.scrollLeft).toBe(100);
      expect(filter.classList.contains('timeline-tag-filter--dragging')).toBe(
        false
      );
    });

    chips[0]?.click();
    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      tagIds: ['tag-1'],
    });
  });

  it('mantém o clique normal quando não há arraste', () => {
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);
    const filter = layout.querySelector<HTMLElement>('#timeline-tag-filter')!;
    const chip = filter.querySelector<HTMLButtonElement>(
      '.timeline-tag-filter__chip'
    )!;

    setSize(filter, 200, 600);

    filter.dispatchEvent(pointer('pointerdown', 150));
    window.dispatchEvent(pointer('pointerup', 150));

    chip.click();

    expect(AppController.updateTimelineFilters).toHaveBeenCalledWith({
      tagIds: ['tag-1'],
    });
  });

  it('não inicia o arraste quando as tags não transbordam', () => {
    const layout = renderTimelineLayout(makeState());
    document.body.appendChild(layout);
    const filter = layout.querySelector<HTMLElement>('#timeline-tag-filter')!;

    setSize(filter, 600, 600);

    filter.dispatchEvent(pointer('pointerdown', 150));
    window.dispatchEvent(pointer('pointermove', 50));

    expect(filter.scrollLeft).toBe(0);
    expect(filter.classList.contains('timeline-tag-filter--dragging')).toBe(
      false
    );
  });
});
