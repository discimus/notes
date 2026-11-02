import { el, qs } from '../dom.js';

export interface TagMenuActions {
  onRename: () => void;
  onDelete: () => void;
}

export function showTagMenu(
  event: MouseEvent,
  tagName: string,
  actions: TagMenuActions
): void {
  event.stopPropagation();
  qs('#tag-menu')?.remove();

  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) return;
  const menu = el('div', 'chain-menu tag-menu');
  menu.id = 'tag-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', `Ações da tag ${tagName}`);

  let closed = false;
  const close = (restoreFocus = false): void => {
    if (closed) return;
    closed = true;
    menu.remove();
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus();
  };

  const items = [
    { icon: 'edit', label: 'Renomear', action: actions.onRename },
    {
      icon: 'delete',
      label: 'Excluir',
      action: actions.onDelete,
      danger: true,
    },
  ];

  items.forEach(({ icon, label, action, danger }) => {
    const item = el(
      'button',
      `chain-menu__item${danger ? ' chain-menu__item--danger' : ''}`
    );
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.setAttribute('aria-label', label);
    item.innerHTML = `<span class="material-symbols-rounded icon-lg" aria-hidden="true">${icon}</span>${label}`;
    item.addEventListener('click', () => {
      close();
      action();
    });
    menu.appendChild(item);
  });

  trigger.setAttribute('aria-expanded', 'true');
  document.body.appendChild(menu);

  const rect = trigger.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  const menuRect = menu.getBoundingClientRect();
  if (rect.bottom + 4 + menuRect.height > window.innerHeight) {
    menu.style.top = `${Math.max(8, rect.top - menuRect.height - 4)}px`;
  }

  const focusables = [...menu.querySelectorAll<HTMLButtonElement>(
    '.chain-menu__item'
  )];
  queueMicrotask(() => focusables[0]?.focus());

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const index = focusables.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = (index + delta + focusables.length) % focusables.length;
    focusables[next]?.focus();
  });

  setTimeout(() => {
    document.addEventListener('click', () => close(), { once: true });
  }, 0);
}
