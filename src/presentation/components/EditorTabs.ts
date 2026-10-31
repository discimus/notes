import type { EditorSnapshot, EditorTab } from '../state/EditorStore.js';
import { isEditorTabDirty } from '../state/EditorStore.js';
import { el } from '../dom.js';

export interface EditorTabsHandlers {
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

function tabLabel(tab: EditorTab): string {
  return tab.title.trim() || 'Sem título';
}

export function focusEditorTab(id: string): void {
  document.getElementById(`editor-tab-${id}`)?.focus();
}

export function renderEditorTabs(
  container: HTMLElement,
  snapshot: EditorSnapshot,
  handlers: EditorTabsHandlers
): void {
  container.innerHTML = '';
  container.setAttribute('role', 'tablist');
  container.setAttribute('aria-label', 'Documentos abertos');
  container.setAttribute('aria-orientation', 'horizontal');

  const tabs = snapshot.tabs;

  tabs.forEach((tab, index) => {
    const dirty = isEditorTabDirty(tab);
    const label = tabLabel(tab);

    const wrapper = el('div', 'editor-tab');
    wrapper.setAttribute('role', 'presentation');
    wrapper.setAttribute('data-tab-id', tab.id);
    wrapper.classList.toggle('editor-tab--active', tab.id === snapshot.activeTabId);
    wrapper.classList.toggle('editor-tab--dirty', dirty);

    const button = el('button', 'editor-tab__button');
    button.id = `editor-tab-${tab.id}`;
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', tab.id === snapshot.activeTabId ? 'true' : 'false');
    button.setAttribute('aria-controls', 'editor-panel');
    button.tabIndex = tab.id === snapshot.activeTabId ? 0 : -1;
    button.title = `${label}${dirty ? ' — alterações não salvas' : ''}`;

    const icon = el('span', 'editor-tab__icon material-symbols-rounded');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = tab.kind === 'chain' ? 'account_tree' : 'edit_note';

    const text = el('span', 'editor-tab__label');
    text.textContent = label;

    const dirtyDot = el('span', 'editor-tab__dirty');
    dirtyDot.setAttribute('aria-hidden', 'true');

    button.append(icon, text, dirtyDot);

    const close = el('button', 'editor-tab__close');
    close.type = 'button';
    close.setAttribute('aria-label', `Fechar ${label}`);
    close.title = `Fechar ${label}`;
    close.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>';

    button.addEventListener('click', () => handlers.onSelect(tab.id));
    button.addEventListener('keydown', (event) => {
      let nextIndex: number | null = null;

      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;

      if (nextIndex === null) return;
      event.preventDefault();
      const next = tabs[nextIndex];
      if (!next) return;
      handlers.onSelect(next.id);
      focusEditorTab(next.id);
    });

    close.addEventListener('click', (event) => {
      event.stopPropagation();
      handlers.onClose(tab.id);
    });

    wrapper.append(button, close);
    container.appendChild(wrapper);
  });
}

export function updateTabDirtyState(container: HTMLElement, tab: EditorTab): void {
  const wrapper = container.querySelector<HTMLElement>(
    `[data-tab-id="${tab.id}"]`
  );
  if (!wrapper) return;

  const dirty = isEditorTabDirty(tab);
  wrapper.classList.toggle('editor-tab--dirty', dirty);

  const button = wrapper.querySelector<HTMLButtonElement>('[role="tab"]');
  if (button) {
    const label = tab.title.trim() || 'Sem título';
    button.title = `${label}${dirty ? ' — alterações não salvas' : ''}`;
  }
}
