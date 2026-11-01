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

describe('PeriodMenu — estado ativo', () => {
  afterEach(() => {
    view?.destroy();
    view = null;
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('marca o mês ativo com check e aria-current e foca nele', () => {
    view = mountPeriodMenu({ onSelect: vi.fn() });
    view.update(makeYears(), '2026-02');

    const anchor = document.createElement('button');
    anchor.type = 'button';
    document.body.appendChild(anchor);

    view.open(anchor);

    const options = [
      ...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    ];

    expect(options).toHaveLength(2);
    expect(options[0]?.hasAttribute('aria-current')).toBe(false);
    expect(options[1]?.getAttribute('aria-current')).toBe('true');
    expect(options[1]?.getAttribute('aria-label')).toContain('selecionado');
    expect(
      options[1]?.querySelector('.period-menu__check')?.textContent
    ).toBe('check');
    expect(options[0]?.querySelector('.period-menu__check')?.textContent).toBe(
      ''
    );
    expect(document.activeElement).toBe(options[1]);
  });

  it('atualiza o mês ativo e mantém o foco no item selecionado', () => {
    view = mountPeriodMenu({ onSelect: vi.fn() });
    view.update(makeYears(), '2026-02');

    const anchor = document.createElement('button');
    anchor.type = 'button';
    document.body.appendChild(anchor);

    view.open(anchor);
    view.update(makeYears(), '2026-01');
    view.open(anchor);

    const options = [
      ...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    ];

    expect(options[0]?.getAttribute('aria-current')).toBe('true');
    expect(options[1]?.hasAttribute('aria-current')).toBe(false);
    expect(document.activeElement).toBe(options[0]);
  });
});
