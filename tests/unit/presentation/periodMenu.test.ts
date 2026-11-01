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
  count: number,
  noteIds: string[]
): NotePeriodMonth {
  return {
    key,
    year: 2026,
    monthIndex,
    monthLabel,
    count,
    noteIds,
  };
}

function makeYears(): NotePeriodYear[] {
  return [
    {
      year: 2026,
      count: 12,
      months: [
        makeMonth('2026-02', 1, 'Fevereiro', 8, ['feb-1', 'feb-2']),
        makeMonth('2026-01', 0, 'Janeiro', 4, ['jan-1']),
      ],
    },
  ];
}

function mount(
  onSelect: (month: NotePeriodMonth) => void
): { menu: PeriodMenuView; anchor: HTMLButtonElement } {
  view = mountPeriodMenu({ onSelect });
  const anchor = document.createElement('button');
  anchor.type = 'button';
  anchor.textContent = 'Hoje';
  anchor.setAttribute('aria-haspopup', 'menu');
  anchor.setAttribute('aria-expanded', 'false');
  document.body.appendChild(anchor);
  view.update(makeYears());
  return { menu: view, anchor };
}

describe('PeriodMenu', () => {
  afterEach(() => {
    view?.destroy();
    view = null;
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('abre a partir do badge, lista somente meses e seleciona', () => {
    const onSelect = vi.fn();
    const { menu, anchor } = mount(onSelect);

    menu.open(anchor);

    expect(anchor.getAttribute('aria-expanded')).toBe('true');
    expect(anchor.getAttribute('aria-controls')).not.toBeNull();

    const menuElement = document.querySelector<HTMLElement>('[role="menu"]');
    const options = [
      ...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    ];

    expect(menuElement).not.toBeNull();
    expect(menuElement?.textContent).not.toContain('Todos os períodos');
    expect(options).toHaveLength(2);
    expect(options[0]?.textContent).toContain('Fevereiro');
    expect(options[0]?.textContent).toContain('8 notas');
    expect(options[1]?.textContent).toContain('Janeiro');
    expect(document.activeElement).toBe(options[0]);

    options[1]?.click();

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ key: '2026-01', noteIds: ['jan-1'] })
    );
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
  });

  it('suporta teclado, Enter, Escape e restauração de foco', () => {
    const onSelect = vi.fn();
    const { menu, anchor } = mount(onSelect);

    menu.open(anchor);
    const first = document.activeElement as HTMLElement;
    expect(first.getAttribute('role')).toBe('menuitem');

    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    const second = document.activeElement as HTMLElement;
    expect(second.textContent).toContain('Janeiro');

    second.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    expect(onSelect).toHaveBeenCalled();

    menu.open(anchor);
    const reopened = document.activeElement as HTMLElement;
    reopened.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );

    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });

  it('fecha ao clicar fora e reabre a partir de outro badge', () => {
    vi.useFakeTimers();
    const { menu, anchor } = mount(vi.fn());

    menu.open(anchor);
    vi.runAllTimers();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(anchor.getAttribute('aria-expanded')).toBe('false');

    const other = document.createElement('button');
    other.type = 'button';
    document.body.appendChild(other);
    menu.open(other);

    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    expect(other.getAttribute('aria-expanded')).toBe('true');
    expect(anchor.getAttribute('aria-expanded')).toBe('false');

    menu.destroy();
  });
});
