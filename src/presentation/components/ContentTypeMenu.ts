import type { NoteContentType } from '@application/dto/index.js';
import {
  isNoteContentType,
  NOTE_CONTENT_TYPE_META,
  NOTE_CONTENT_TYPE_OPTIONS,
} from '../app/noteContentTypes.js';
import { el } from '../dom.js';

export interface ContentTypeMenuOptions {
  value: NoteContentType;
  onChange: (value: NoteContentType) => void;
}

export interface ContentTypeMenuView {
  element: HTMLElement;
  update: (value: NoteContentType) => void;
  destroy: () => void;
}

const WHEEL_COOLDOWN_MS = 300;

export function mountContentTypeMenu(
  options: ContentTypeMenuOptions
): ContentTypeMenuView {
  let value = options.value;
  let open = false;

  const wrapper = el('div', 'content-type-control');
  const button = el('button', 'content-type-control__button');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');

  const icon = el('span', 'material-symbols-rounded content-type-control__icon');
  icon.setAttribute('aria-hidden', 'true');
  const label = el('span', 'content-type-control__label');
  const arrow = el('span', 'material-symbols-rounded content-type-control__arrow');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = 'arrow_drop_down';
  button.append(icon, label, arrow);
  wrapper.appendChild(button);

  let menu: HTMLElement | null = null;
  let outsideTimer: ReturnType<typeof setTimeout> | null = null;
  let wheelLocked = false;
  let wheelTimer: ReturnType<typeof setTimeout> | null = null;

  const syncButton = (): void => {
    const meta = NOTE_CONTENT_TYPE_META[value];
    icon.textContent = meta.icon;
    label.textContent = meta.label;
    button.setAttribute('aria-label', `Tipo de conteúdo: ${meta.label}`);
    button.title = `Tipo de conteúdo: ${meta.label} — role o scroll para alternar`;
  };

  const removeOutside = (): void => {
    if (outsideTimer !== null) {
      clearTimeout(outsideTimer);
      outsideTimer = null;
    }
    document.removeEventListener('click', onDocumentClick);
    window.removeEventListener('resize', closeFromEvent);
    window.removeEventListener('scroll', closeFromEvent, true);
  };

  const close = (restoreFocus = false): void => {
    if (!open) return;
    open = false;
    button.setAttribute('aria-expanded', 'false');
    menu?.remove();
    menu = null;
    removeOutside();
    if (restoreFocus) button.focus();
  };

  const closeFromEvent = (): void => close();

  function onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu?.contains(target) || button.contains(target)) return;
    close();
  }

  const select = (next: NoteContentType): void => {
    value = next;
    syncButton();
    close(true);
    options.onChange(next);
  };

  const positionMenu = (element: HTMLElement): void => {
    element.style.visibility = 'hidden';
    element.style.left = '0px';
    element.style.top = '0px';
    document.body.appendChild(element);

    const trigger = button.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, trigger.left),
      Math.max(8, window.innerWidth - bounds.width - 8)
    );
    const above = trigger.top - bounds.height - 6;
    const top = above >= 8 ? above : trigger.bottom + 6;

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.visibility = '';
  };

  const openMenu = (focusLast = false): void => {
    if (open) return;
    open = true;
    button.setAttribute('aria-expanded', 'true');

    menu = el('div', 'content-type-menu');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Tipo de conteúdo');

    const heading = el('div', 'content-type-menu__heading');
    heading.textContent = 'Tipo de conteúdo';
    menu.appendChild(heading);

    NOTE_CONTENT_TYPE_OPTIONS.forEach((type) => {
      const meta = NOTE_CONTENT_TYPE_META[type];
      const item = el('button', 'content-type-menu__item');
      item.type = 'button';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', value === type ? 'true' : 'false');
      item.dataset['contentType'] = type;

      const itemIcon = el('span', 'material-symbols-rounded content-type-menu__icon');
      itemIcon.setAttribute('aria-hidden', 'true');
      itemIcon.textContent = meta.icon;
      const text = el('span', 'content-type-menu__label');
      text.textContent = meta.label;
      const check = el('span', 'material-symbols-rounded content-type-menu__check');
      check.setAttribute('aria-hidden', 'true');
      check.textContent = value === type ? 'check' : '';

      item.append(itemIcon, text, check);
      item.addEventListener('click', () => select(type));
      menu!.appendChild(item);
    });

    menu.addEventListener('keydown', onMenuKeyDown);
    positionMenu(menu);

    const items = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
    const selectedIndex = items.findIndex((item) => item.dataset['contentType'] === value);
    const target = focusLast
      ? items[items.length - 1]
      : items[Math.max(0, selectedIndex)];
    target?.focus();

    outsideTimer = setTimeout(() => {
      outsideTimer = null;
      document.addEventListener('click', onDocumentClick);
    }, 0);
    window.addEventListener('resize', closeFromEvent);
    window.addEventListener('scroll', closeFromEvent, true);
  };

  const onMenuKeyDown = (event: KeyboardEvent): void => {
    if (!menu) return;
    const items = [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
    const index = items.findIndex((item) => item === document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
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
      const type = current?.dataset['contentType'];
      if (isNoteContentType(type)) select(type);
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % items.length;
    else if (event.key === 'ArrowUp') nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    close(true);
  };

  const onWheel = (event: WheelEvent): void => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    if (wheelLocked) return;

    wheelLocked = true;
    if (wheelTimer !== null) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelTimer = null;
      wheelLocked = false;
    }, WHEEL_COOLDOWN_MS);

    const currentIndex = NOTE_CONTENT_TYPE_OPTIONS.indexOf(value);
    const direction = event.deltaY > 0 ? 1 : -1;
    const next = NOTE_CONTENT_TYPE_OPTIONS[
      (currentIndex + direction + NOTE_CONTENT_TYPE_OPTIONS.length) %
        NOTE_CONTENT_TYPE_OPTIONS.length
    ];
    if (next) select(next);
  };

  button.addEventListener('click', () => {
    if (open) close();
    else openMenu();
  });
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!open) openMenu(event.key === 'ArrowUp');
  });
  button.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('keydown', onDocumentKeyDown);

  const update = (next: NoteContentType): void => {
    if (value === next) return;
    value = next;
    syncButton();
    if (!menu) return;
    menu.querySelectorAll<HTMLElement>('[data-content-type]').forEach((item) => {
      const selected = item.dataset['contentType'] === next;
      item.setAttribute('aria-checked', selected ? 'true' : 'false');
      const check = item.querySelector<HTMLElement>('.content-type-menu__check');
      if (check) check.textContent = selected ? 'check' : '';
    });
  };

  const destroy = (): void => {
    close();
    if (wheelTimer !== null) clearTimeout(wheelTimer);
    wheelTimer = null;
    button.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onDocumentKeyDown);
  };

  syncButton();

  return { element: wrapper, update, destroy };
}
