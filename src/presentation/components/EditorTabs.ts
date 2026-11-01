import type { EditorSnapshot, EditorTab } from '../state/EditorStore.js';
import { isEditorTabDirty } from '../state/EditorStore.js';
import { el } from '../dom.js';

export interface EditorTabsHandlers {
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCreate?: () => void;
  onRename?: (id: string, title: string) => void;
}

export interface TabListItem {
  id: string;
  label: string;
  icon: string;
  dirty: boolean;
  renamable?: boolean;
  preview?: boolean;
  editing?: boolean;
}

const renameStarters = new WeakMap<HTMLElement, Map<string, () => void>>();

export function beginTabRename(container: HTMLElement, tabId: string): boolean {
  const starter = renameStarters.get(container)?.get(tabId);
  if (!starter) return false;
  starter();
  return true;
}

export interface TabListOptions {
  panelId?: string;
  ariaLabel?: string;
}

function tabLabel(tab: EditorTab): string {
  const title = tab.title.trim();
  if (tab.kind === 'draft' && (!title || title === 'Sem título')) {
    return 'Novo documento';
  }
  return title || 'Novo documento';
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
  const starters = new Map<string, () => void>();
  renameStarters.set(container, starters);

  container.innerHTML = '';
  container.setAttribute('role', 'tablist');
  container.setAttribute('aria-label', ariaLabel);
  container.setAttribute('aria-orientation', 'horizontal');
  container.ondblclick = (event) => {
    if (event.target === container) {
      handlers.onCreate?.();
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('.editor-tab__close')) return;
    const label = target.closest('.editor-tab__label');
    const tab = label?.closest<HTMLElement>('.editor-tab');
    const tabId = tab?.dataset['tabId'];
    if (!tabId) return;

    const startRename = starters.get(tabId);
    if (!startRename) return;
    event.preventDefault();
    startRename();
  };

  items.forEach((item, index) => {
    const wrapper = el('div', 'editor-tab');
    wrapper.setAttribute('role', 'presentation');
    wrapper.setAttribute('data-tab-id', item.id);
    wrapper.classList.toggle('editor-tab--active', item.id === activeId);
    wrapper.classList.toggle('editor-tab--dirty', item.dirty);
    wrapper.classList.toggle('editor-tab--preview', item.preview === true);
    wrapper.classList.toggle('editor-tab--editing', item.editing === true);

    const button = el('button', 'editor-tab__button');
    button.id = `editor-tab-${item.id}`;
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', item.id === activeId ? 'true' : 'false');
    button.setAttribute('aria-controls', panelId);
    button.tabIndex = item.id === activeId ? 0 : -1;
    button.title = `${item.label}${item.editing ? ' · editando' : ''}${
      item.preview ? ' · prévia substituível' : ''
    }${item.dirty ? ' · alterações não salvas' : ''}`;
    if (item.editing && item.preview) {
      button.setAttribute(
        'aria-description',
        'Aba de prévia substituível em edição. Dê dois cliques na nota para manter aberta.'
      );
    } else if (item.editing) {
      button.setAttribute('aria-description', 'Editando nota existente');
    } else if (item.preview) {
      button.setAttribute(
        'aria-description',
        'Aba de prévia substituível. Dê dois cliques para manter aberta.'
      );
    }

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

    const startRename = (): void => {
      if (!item.renamable || !handlers.onRename || wrapper.classList.contains('editor-tab--renaming')) {
        return;
      }

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'editor-tab__rename-input';
      input.value = item.label;
      input.setAttribute('aria-label', 'Renomear cadeia');
      input.autocomplete = 'off';

      wrapper.classList.add('editor-tab--renaming');
      button.hidden = true;
      wrapper.insertBefore(input, close);

      let finished = false;
      const restore = (focusTab: boolean): void => {
        input.remove();
        button.hidden = false;
        wrapper.classList.remove('editor-tab--renaming');
        if (focusTab) button.focus();
      };
      const cancel = (focusTab: boolean): void => {
        if (finished) return;
        finished = true;
        restore(focusTab);
      };
      const save = (): void => {
        if (finished) return;
        const title = input.value.trim();
        if (!title) {
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }
        finished = true;
        restore(true);
        if (title !== item.label.trim()) handlers.onRename?.(item.id, title);
      };

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          save();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancel(true);
        }
      });
      input.addEventListener('blur', () => cancel(false));
      input.addEventListener('input', () => input.removeAttribute('aria-invalid'));

      input.focus();
      input.select();
    };

    if (item.renamable && handlers.onRename) {
      starters.set(item.id, startRename);
    }

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

    wrapper.addEventListener('mousedown', (event) => {
      if (event.button === 1) event.preventDefault();
    });

    wrapper.addEventListener('auxclick', (event) => {
      if (event.button !== 1) return;
      event.preventDefault();
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
    renamable: tab.kind === 'chain',
    preview: tab.kind === 'chain' && tab.preview === true,
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
    tabLabel(tab),
    tab.kind === 'chain' && tab.preview === true
  );
}

export function updateTabDirtyStateById(
  container: HTMLElement,
  id: string,
  dirty: boolean,
  label: string,
  preview = false
): void {
  const wrapper = container.querySelector<HTMLElement>(
    `[data-tab-id="${id}"]`
  );
  if (!wrapper) return;

  wrapper.classList.toggle('editor-tab--dirty', dirty);
  wrapper.classList.toggle('editor-tab--preview', preview);

  const button = wrapper.querySelector<HTMLButtonElement>('[role="tab"]');
  if (button) {
    button.title = `${label}${preview ? ' · prévia substituível' : ''}${
      dirty ? ' · alterações não salvas' : ''
    }`;
    if (preview) {
      button.setAttribute(
        'aria-description',
        'Aba de prévia substituível. Dê dois cliques para manter aberta.'
      );
    } else {
      button.removeAttribute('aria-description');
    }
  }
}
