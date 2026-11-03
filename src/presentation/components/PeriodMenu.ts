import type { NotePeriodMonth, NotePeriodYear } from '../app/editorGrouping.js';
import { el } from '../dom.js';

export interface PeriodMenuOptions {
  onSelect: (month: NotePeriodMonth) => void;
}

export interface PeriodMenuView {
  open: (anchor: HTMLElement, focusLast?: boolean) => void;
  update: (
    years: NotePeriodYear[],
    activeKey?: string | null,
    pageKey?: string | null
  ) => void;
  setActive: (activeKey: string | null) => void;
  setPage: (pageKey: string | null) => void;
  destroy: () => void;
}

let menuSequence = 0;

function noteCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'nota' : 'notas'}`;
}

function findMonth(
  years: NotePeriodYear[],
  key: string
): NotePeriodMonth | null {
  for (const year of years) {
    const month = year.months.find((item) => item.key === key);
    if (month) return month;
  }
  return null;
}

export function mountPeriodMenu(
  options: PeriodMenuOptions
): PeriodMenuView {
  const menuId = `period-menu-${++menuSequence}`;
  let years: NotePeriodYear[] = [];
  let activeKey: string | null = null;
  let pageKey: string | null = null;
  let anchor: HTMLElement | null = null;
  let open = false;
  let menu: HTMLElement | null = null;
  let outsideTimer: ReturnType<typeof setTimeout> | null = null;

  const removeOutside = (): void => {
    if (outsideTimer !== null) {
      clearTimeout(outsideTimer);
      outsideTimer = null;
    }
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeyDown);
    window.removeEventListener('resize', closeFromViewportChange);
    window.removeEventListener('scroll', closeFromViewportChange, true);
  };

  const resetAnchor = (): void => {
    if (!anchor) return;
    anchor.setAttribute('aria-expanded', 'false');
    anchor.removeAttribute('aria-controls');
    anchor = null;
  };

  const close = (restoreFocus = false): void => {
    if (!open) return;
    open = false;
    const currentAnchor = anchor;
    resetAnchor();
    menu?.remove();
    menu = null;
    removeOutside();
    if (restoreFocus) currentAnchor?.focus();
  };

  const closeFromViewportChange = (event: Event): void => {
    if (
      event.type === 'scroll' &&
      event.target instanceof Node &&
      menu?.contains(event.target)
    ) {
      return;
    }
    close();
  };

  function onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu?.contains(target)) return;
    close();
  }

  function onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }

  const select = (month: NotePeriodMonth): void => {
    close(false);
    options.onSelect(month);
  };

  const applyItemState = (
    item: HTMLButtonElement,
    selected: boolean,
    pageCurrent: boolean
  ): void => {
    item.classList.toggle('period-menu__item--page-current', pageCurrent);
    if (pageCurrent) item.dataset['periodPageCurrent'] = 'true';
    else delete item.dataset['periodPageCurrent'];

    if (selected) item.setAttribute('aria-current', 'true');
    else item.removeAttribute('aria-current');

    const baseLabel = item.dataset['baseLabel'] ?? '';
    const states = [
      ...(selected ? ['selecionado'] : []),
      ...(pageCurrent ? ['mês exibido'] : []),
    ];
    item.setAttribute(
      'aria-label',
      `${baseLabel}${states.length > 0 ? `, ${states.join(', ')}` : ''}`
    );

    const check = item.querySelector<HTMLElement>('.period-menu__check');
    if (check) check.textContent = selected ? 'check' : '';
  };

  const renderItem = (month: NotePeriodMonth): HTMLButtonElement => {
    const item = el('button', 'period-menu__item');
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    const baseLabel = `${month.monthLabel}, ${noteCountLabel(month.count)}`;
    item.dataset['periodKey'] = month.key;
    item.dataset['baseLabel'] = baseLabel;

    const text = el('span', 'period-menu__label');
    text.textContent = month.monthLabel;
    const countLabel = el('span', 'period-menu__count');
    countLabel.textContent = noteCountLabel(month.count);
    const check = el('span', 'material-symbols-rounded period-menu__check');
    check.setAttribute('aria-hidden', 'true');
    item.append(text, countLabel, check);

    applyItemState(
      item,
      month.key === activeKey,
      month.key === pageKey
    );

    item.addEventListener('click', () => select(month));
    return item;
  };

  const positionMenu = (element: HTMLElement): void => {
    if (!anchor) return;
    element.style.visibility = 'hidden';
    element.style.left = '0px';
    element.style.top = '0px';
    document.body.appendChild(element);

    const rect = anchor.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - bounds.width - 8)
    );
    const above = rect.top - bounds.height - 6;
    const top = above >= 8 ? above : rect.bottom + 6;
    const maxTop = Math.max(8, window.innerHeight - bounds.height - 8);

    element.style.left = `${left}px`;
    element.style.top = `${Math.min(top, maxTop)}px`;
    element.style.visibility = '';
  };

  const buildMenu = (): HTMLElement => {
    const element = el('div', 'period-menu');
    element.id = menuId;
    element.setAttribute('role', 'menu');
    element.setAttribute('aria-label', 'Ir para período');

    const heading = el('div', 'period-menu__heading');
    heading.setAttribute('aria-hidden', 'true');
    heading.textContent = 'Ir para período';
    element.appendChild(heading);

    years.forEach((periodYear) => {
      const group = el('div', 'period-menu__year');
      group.setAttribute('role', 'group');
      group.setAttribute(
        'aria-label',
        `${periodYear.year}, ${noteCountLabel(periodYear.count)}`
      );

      const yearLabel = el('div', 'period-menu__year-label');
      yearLabel.setAttribute('aria-hidden', 'true');
      const yearName = el('span', 'period-menu__year-name');
      yearName.textContent = String(periodYear.year);
      const yearCount = el('span', 'period-menu__year-count');
      yearCount.textContent = noteCountLabel(periodYear.count);
      yearLabel.append(yearName, yearCount);
      group.appendChild(yearLabel);

      periodYear.months.forEach((month) => {
        group.appendChild(renderItem(month));
      });

      element.appendChild(group);
    });

    return element;
  };

  const menuItems = (): HTMLButtonElement[] =>
    menu
      ? [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
      : [];

  const onMenuKeyDown = (event: KeyboardEvent): void => {
    const items = menuItems();
    if (items.length === 0) return;
    const index = items.findIndex((item) => item === document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const current = items[index];
      const key = current?.dataset['periodKey'];
      if (key) {
        const month = findMonth(years, key);
        if (month) select(month);
      }
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % items.length;
    else if (event.key === 'ArrowUp') {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const openMenu = (nextAnchor: HTMLElement, focusLast = false): void => {
    if (years.length === 0) return;
    if (open && anchor === nextAnchor) {
      close(true);
      return;
    }
    if (open) close(false);

    anchor = nextAnchor;
    open = true;
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-controls', menuId);

    menu = buildMenu();
    menu.addEventListener('keydown', onMenuKeyDown);
    positionMenu(menu);

    const items = menuItems();
    const focusKey = activeKey ?? pageKey;
    const focusIndex = items.findIndex(
      (item) => item.dataset['periodKey'] === focusKey
    );
    const target = focusLast
      ? items[items.length - 1]
      : items[focusIndex >= 0 ? focusIndex : 0];
    target?.focus();

    outsideTimer = setTimeout(() => {
      outsideTimer = null;
      document.addEventListener('click', onDocumentClick);
    }, 0);
    document.addEventListener('keydown', onDocumentKeyDown);
    window.addEventListener('resize', closeFromViewportChange);
    window.addEventListener('scroll', closeFromViewportChange, true);
  };

  const update = (
    nextYears: NotePeriodYear[],
    nextActiveKey: string | null = null,
    nextPageKey: string | null = null
  ): void => {
    if (open) close(false);
    years = nextYears;
    activeKey = nextActiveKey;
    pageKey = nextPageKey;
  };

  const syncItems = (): void => {
    if (!menu) return;

    menuItems().forEach((item) => {
      const key = item.dataset['periodKey'] ?? null;
      applyItemState(item, key === activeKey, key === pageKey);
    });
  };

  const setActive = (nextActiveKey: string | null): void => {
    activeKey = nextActiveKey;
    syncItems();
  };

  const setPage = (nextPageKey: string | null): void => {
    pageKey = nextPageKey;
    syncItems();
  };

  const destroy = (): void => {
    close(false);
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeyDown);
  };

  return { open: openMenu, update, setActive, setPage, destroy };
}
