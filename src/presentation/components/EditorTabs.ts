import type { EditorSnapshot, EditorTab } from '../state/EditorStore.js';
import { isEditorTabDirty } from '../state/EditorStore.js';
import { el } from '../dom.js';

export interface EditorTabsHandlers {
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export interface TabListItem {
  id: string;
  label: string;
  icon: string;
  dirty: boolean;
}

export interface TabListOptions {
  panelId?: string;
  ariaLabel?: string;
}

function tabLabel(tab: EditorTab): string {
  return tab.title.trim() || 'Sem título';
}

export function focusEditorTab(id: string): void {
  document.getElementById(`editor-tab-${id}`)?.focus();
}

export function renderTabList(
  container: HTMLElement,
  items: TabListItem[],
  activeId: string | null,
  handlers: EditorTabsHandlers,
  options: TabListOptions = {}
): void {
  const panelId = options.panelId ?? 'editor-panel';
  const ariaLabel = options.ariaLabel ?? 'Documentos abertos';

  container.innerHTML = '';
  container.setAttribute('role', 'tablist');
  container.setAttribute('aria-label', ariaLabel);
  container.setAttribute('aria-orientation', 'horizontal');

  items.forEach((item, index) => {
    const wrapper = el('div', 'editor-tab');
    wrapper.setAttribute('role', 'presentation');
    wrapper.setAttribute('data-tab-id', item.id);
    wrapper.classList.toggle('editor-tab--active', item.id === activeId);
    wrapper.classList.toggle('editor-tab--dirty', item.dirty);

    const button = el('button', 'editor-tab__button');
    button.id = `editor-tab-${item.id}`;
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', item.id === activeId ? 'true' : 'false');
    button.setAttribute('aria-controls', panelId);
    button.tabIndex = item.id === activeId ? 0 : -1;
    button.title = `${item.label}${item.dirty ? ' — alterações não salvas' : ''}`;

    const icon = el('span', 'editor-tab__icon material-symbols-rounded');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;

    const text = el('span', 'editor-tab__label');
    text.textContent = item.label;

    const dirtyDot = el('span', 'editor-tab__dirty');
    dirtyDot.setAttribute('aria-hidden', 'true');

    button.append(icon, text, dirtyDot);

    const close = el('button', 'editor-tab__close');
    close.type = 'button';
    close.setAttribute('aria-label', `Fechar ${item.label}`);
    close.title = `Fechar ${item.label}`;
    close.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>';

    button.addEventListener('click', () => handlers.onSelect(item.id));
    button.addEventListener('keydown', (event) => {
      let nextIndex: number | null = null;

      if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = items.length - 1;

      if (nextIndex === null) return;
      event.preventDefault();
      const next = items[nextIndex];
      if (!next) return;
      handlers.onSelect(next.id);
      focusEditorTab(next.id);
    });

    close.addEventListener('click', (event) => {
      event.stopPropagation();
      handlers.onClose(item.id);
    });

    wrapper.append(button, close);
    container.appendChild(wrapper);
  });
}

export function renderEditorTabs(
  container: HTMLElement,
  snapshot: EditorSnapshot,
  handlers: EditorTabsHandlers
): void {
  const items: TabListItem[] = snapshot.tabs.map((tab) => ({
    id: tab.id,
    label: tabLabel(tab),
    icon: tab.kind === 'chain' ? 'account_tree' : 'edit_note',
    dirty: isEditorTabDirty(tab),
  }));

  renderTabList(container, items, snapshot.activeTabId, handlers, {
    panelId: 'editor-panel',
    ariaLabel: 'Documentos abertos',
  });
}

export function updateTabDirtyState(container: HTMLElement, tab: EditorTab): void {
  updateTabDirtyStateById(
    container,
    tab.id,
    isEditorTabDirty(tab),
    tab.title.trim() || 'Sem título'
  );
}

export function updateTabDirtyStateById(
  container: HTMLElement,
  id: string,
  dirty: boolean,
  label: string
): void {
  const wrapper = container.querySelector<HTMLElement>(
    `[data-tab-id="${id}"]`
  );
  if (!wrapper) return;

  wrapper.classList.toggle('editor-tab--dirty', dirty);

  const button = wrapper.querySelector<HTMLButtonElement>('[role="tab"]');
  if (button) {
    button.title = `${label}${dirty ? ' — alterações não salvas' : ''}`;
  }
}
