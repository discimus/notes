import type { TagDTO } from '@application/dto/index.js';
import { normalizeText } from '@shared/utilities/index.js';
import { filterTagSuggestions } from '../app/tagSuggestions.js';
import { el } from '../dom.js';

export interface InlineTagEditorHandlers {
  onAdd: (name: string) => Promise<boolean>;
  onRemove: (tag: TagDTO) => void;
}

export interface InlineTagEditorOptions {
  inputClassName?: string;
  addButtonClassName?: string;
  addButtonAriaLabel?: string;
  addButtonTitle?: string;
  addButtonHaspopup?: 'dialog' | 'listbox' | 'menu' | 'tree' | 'grid';
  addButtonText?: string;
  removeAriaLabel?: (tag: TagDTO) => string;
}

export interface InlineTagEditorView {
  element: HTMLElement;
  update: (tags: TagDTO[], availableTags?: TagDTO[]) => void;
  startEditing: () => void;
  destroy: () => void;
}

let editorSequence = 0;

export function mountInlineTagEditor(
  container: HTMLElement,
  handlers: InlineTagEditorHandlers,
  options: InlineTagEditorOptions = {}
): InlineTagEditorView {
  const sequence = ++editorSequence;
  const errorId = `tag-editor-error-${sequence}`;
  const listboxId = `tag-suggestions-${sequence}`;

  const root = el('div', 'tag-editor');
  const chipsHost = el('div', 'tag-editor__chips');
  const controlHost = el('div', 'tag-editor__control');
  const error = el('p', 'tag-editor__error');

  error.id = errorId;
  error.setAttribute('role', 'status');
  error.setAttribute('aria-live', 'polite');
  error.hidden = true;

  const listbox = el('div', 'tag-suggestions');
  listbox.id = listboxId;
  listbox.setAttribute('role', 'listbox');
  listbox.setAttribute('aria-label', 'Tags existentes');
  listbox.hidden = true;
  document.body.appendChild(listbox);

  root.append(chipsHost, controlHost, error);
  container.appendChild(root);

  let tags: TagDTO[] = [];
  let availableTags: TagDTO[] = [];
  let suggestions: TagDTO[] = [];
  let activeIndex = -1;
  let editing = false;
  let pending = false;
  let input: HTMLInputElement | null = null;

  const showError = (message: string): void => {
    error.textContent = message;
    error.hidden = false;
    input?.setAttribute('aria-invalid', 'true');
  };

  const clearError = (): void => {
    error.textContent = '';
    error.hidden = true;
    input?.removeAttribute('aria-invalid');
  };

  const closeSuggestions = (): void => {
    suggestions = [];
    activeIndex = -1;
    listbox.hidden = true;
    listbox.replaceChildren();
    input?.setAttribute('aria-expanded', 'false');
    input?.removeAttribute('aria-activedescendant');
  };

  const positionSuggestions = (): void => {
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showAbove = spaceBelow < 180 && spaceAbove > spaceBelow;

    listbox.style.width = `${width}px`;
    listbox.style.left = `${Math.max(8, rect.left)}px`;
    listbox.style.top = showAbove ? `${rect.top - 4}px` : `${rect.bottom + 4}px`;
    listbox.style.transform = showAbove ? 'translateY(-100%)' : 'none';
    listbox.style.maxHeight = `${Math.min(
      240,
      Math.max(96, showAbove ? spaceAbove - 8 : spaceBelow - 8)
    )}px`;
  };

  const syncHighlight = (): void => {
    const options = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')];
    options.forEach((option, index) => {
      const active = index === activeIndex;
      option.classList.toggle('tag-suggestion--active', active);
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const active = options[activeIndex];
    if (active) input?.setAttribute('aria-activedescendant', active.id);
    else input?.removeAttribute('aria-activedescendant');
  };

  const renderSuggestions = (): void => {
    if (!editing || !input) {
      closeSuggestions();
      return;
    }

    suggestions = filterTagSuggestions(availableTags, tags, input.value);
    activeIndex = -1;

    if (suggestions.length === 0) {
      closeSuggestions();
      return;
    }

    listbox.replaceChildren();

    suggestions.forEach((tag, index) => {
      const option = el('div', 'tag-suggestion');
      option.id = `${listboxId}-option-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');

      const label = el('span', 'tag-suggestion__label');
      label.textContent = tag.name;
      const count = el('span', 'tag-suggestion__count');
      count.textContent = `${tag.chainCount} ${
        tag.chainCount === 1 ? 'coleção' : 'coleções'
      }`;
      option.append(label, count);

      option.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        selectSuggestion(index);
      });
      option.addEventListener('mouseenter', () => {
        activeIndex = index;
        syncHighlight();
      });

      listbox.appendChild(option);
    });

    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    positionSuggestions();
    syncHighlight();
  };

  const selectSuggestion = (index: number): void => {
    const tag = suggestions[index];
    if (!tag || !input) return;
    input.value = tag.name;
    closeSuggestions();
    void commit('enter', tag.name);
  };

  const renderChips = (): void => {
    chipsHost.innerHTML = '';

    tags.forEach((tag) => {
      const chip = el('span', 'chip chip--selected');
      chip.setAttribute('aria-label', `Tag: ${tag.name}`);
      chip.title = tag.name;

      const label = document.createElement('span');
      label.textContent = tag.name;
      chip.appendChild(label);

      const remove = el('button', 'chip__remove');
      remove.type = 'button';
      remove.setAttribute(
        'aria-label',
        options.removeAriaLabel?.(tag) ?? `Remover tag ${tag.name}`
      );
      remove.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">close</span>';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        handlers.onRemove(tag);
      });
      chip.appendChild(remove);

      chipsHost.appendChild(chip);
    });
  };

  const renderAddButton = (): void => {
    const className = options.addButtonClassName
      ? `chip tag-add ${options.addButtonClassName}`
      : 'chip tag-add';
    const add = el('button', className);
    add.type = 'button';
    add.setAttribute(
      'aria-label',
      options.addButtonAriaLabel ?? 'Adicionar tag'
    );
    if (options.addButtonTitle) add.title = options.addButtonTitle;
    if (options.addButtonHaspopup) {
      add.setAttribute('aria-haspopup', options.addButtonHaspopup);
    }
    add.innerHTML =
      '<span class="material-symbols-rounded icon-md" aria-hidden="true">add</span>';
    const label = options.addButtonText ?? 'Tag';
    if (label.trim()) add.append(document.createTextNode(` ${label}`));
    add.addEventListener('click', startEditing);
    controlHost.replaceChildren(add);
  };

  const closeEditor = (): void => {
    closeSuggestions();
    editing = false;
    pending = false;
    input = null;
    clearError();
    renderAddButton();
  };

  const commit = async (
    reason: 'enter' | 'blur',
    forcedName?: string
  ): Promise<void> => {
    if (!editing || !input || pending) return;

    const name = (forcedName ?? input.value).trim();
    if (!name) {
      closeSuggestions();
      if (reason === 'blur') closeEditor();
      return;
    }

    if (name.length > 50) {
      closeSuggestions();
      showError('A tag não pode exceder 50 caracteres.');
      return;
    }

    if (/\s/.test(name)) {
      closeSuggestions();
      showError('Use hífens em vez de espaços no nome da tag.');
      return;
    }

    const normalized = normalizeText(name);
    if (tags.some((tag) => normalizeText(tag.name) === normalized)) {
      closeSuggestions();
      showError('Essa tag já está adicionada.');
      return;
    }

    pending = true;
    clearError();
    closeSuggestions();
    input.disabled = true;

    try {
      const added = await handlers.onAdd(name);
      if (!added) {
        showError('Não foi possível adicionar a tag.');
        if (input) input.disabled = false;
        return;
      }

      if (reason === 'blur') {
        closeEditor();
        return;
      }

      if (input) {
        input.value = '';
        input.disabled = false;
        input.focus();
        closeSuggestions();
      }
    } catch {
      showError('Não foi possível adicionar a tag.');
      if (input) input.disabled = false;
    } finally {
      pending = false;
    }
  };

  const startEditing = (): void => {
    if (editing) return;

    editing = true;
    clearError();
    closeSuggestions();

    const wrapper = el('div', 'chip tag-add tag-add--editing');
    wrapper.innerHTML =
      '<span class="material-symbols-rounded icon-md" aria-hidden="true">add</span>';

    input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-add__input';
    if (options.inputClassName) input.classList.add(options.inputClassName);
    input.placeholder = 'Nova tag';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-label', 'Nova tag');
    input.setAttribute('aria-describedby', errorId);
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-controls', listboxId);
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = 'off';
    input.spellcheck = false;

    input.addEventListener('input', () => {
      clearError();
      renderSuggestions();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (suggestions.length === 0) return;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        activeIndex =
          activeIndex < 0
            ? direction > 0
              ? 0
              : suggestions.length - 1
            : (activeIndex + direction + suggestions.length) % suggestions.length;
        syncHighlight();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectSuggestion(activeIndex);
          return;
        }
        void commit('enter');
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (suggestions.length > 0) closeSuggestions();
        else closeEditor();
      }
    });

    input.addEventListener('focus', () => {
      if (input?.value.trim()) renderSuggestions();
    });

    input.addEventListener('blur', () => {
      closeSuggestions();
      void commit('blur');
    });

    wrapper.appendChild(input);
    controlHost.replaceChildren(wrapper);
    input.focus();
  };

  const closeOnResize = (): void => closeSuggestions();
  window.addEventListener('resize', closeOnResize);

  renderAddButton();
  renderChips();

  return {
    element: root,
    update: (nextTags: TagDTO[], nextAvailableTags: TagDTO[] = []) => {
      tags = nextTags.map((tag) => ({ ...tag }));
      availableTags = nextAvailableTags.map((tag) => ({ ...tag }));
      renderChips();

      if (editing && input?.value.trim()) renderSuggestions();
      else closeSuggestions();
    },
    startEditing,
    destroy: () => {
      window.removeEventListener('resize', closeOnResize);
      closeSuggestions();
      editing = false;
      pending = false;
      input = null;
      listbox.remove();
      root.remove();
    },
  };
}
