import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  NotePeriodMonth,
  NotePeriodYear,
} from '@presentation/app/editorGrouping.js';
import {
  mountPeriodMenu,
  type PeriodMenuView,
} from '@presentation/components/PeriodMenu.js';

let view: PeriodMenuView | null = null;

function makeMonth(
  key: string,
  monthIndex: number,
  monthLabel: string,
  count: number
): NotePeriodMonth {
  return {
    key,
    year: 2026,
    monthIndex,
    monthLabel,
    count,
    noteIds: [`note-${key}`],
  };
}

function makeYears(): NotePeriodYear[] {
  return [
    {
      year: 2026,
      count: 12,
      months: [
        makeMonth('2026-01', 0, 'Janeiro', 4),
        makeMonth('2026-02', 1, 'Fevereiro', 8),
      ],
    },
  ];
}

describe('PeriodMenu - mês da página', () => {
  afterEach(() => {
    view?.destroy();
    view = null;
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('destaca o mês exibido sem usar aria-current e foca nele', () => {
    view = mountPeriodMenu({ onSelect: vi.fn() });
    view.update(makeYears(), null, '2026-02');

    const anchor = document.createElement('button');
    anchor.type = 'button';
    document.body.appendChild(anchor);
    view.open(anchor);

    const options = [
      ...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    ];
    const january = options[0]!;
    const february = options[1]!;

    expect(
      february.classList.contains('period-menu__item--page-current')
    ).toBe(true);
    expect(february.dataset['periodPageCurrent']).toBe('true');
    expect(february.hasAttribute('aria-current')).toBe(false);
    expect(february.getAttribute('aria-label')).toContain('mês exibido');
    expect(january.classList.contains('period-menu__item--page-current')).toBe(
      false
    );
    expect(document.activeElement).toBe(february);

    view.setActive('2026-01');

    expect(january.getAttribute('aria-current')).toBe('true');
    expect(february.hasAttribute('aria-current')).toBe(false);
    expect(
      february.classList.contains('period-menu__item--page-current')
    ).toBe(true);

    view.setPage('2026-01');

    expect(january.classList.contains('period-menu__item--page-current')).toBe(
      true
    );
    expect(february.classList.contains('period-menu__item--page-current')).toBe(
      false
    );
  });
});
