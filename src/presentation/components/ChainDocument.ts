import type { NoteDTO, TagDTO } from '@application/dto/index.js';
import type { ChainTab } from '../state/EditorStore.js';
import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { groupNotesByDate } from '../app/editorGrouping.js';
import { showInputDialog } from './Dialog.js';
import { renderEmptyDetail, renderLoadingState } from './states.js';
import { showChainMenu } from '../views/menus.js';
import { el } from '../dom.js';
import { formatDateFull, formatTime } from '@shared/utilities/index.js';

export interface ChainDocumentHandlers {
  onComposerInput: (value: string) => void;
  onAppend: () => void;
}

export interface ChainDocumentView {
  element: HTMLElement;
  update: (tab: ChainTab) => void;
  setSaving: (saving: boolean) => void;
  clearComposerIf: (content: string) => void;
  focusComposer: () => void;
  destroy: () => void;
}

function renderTagChip(tag: TagDTO, chainId: string): HTMLElement {
  const chip = el('span', 'chip chip--selected');
  chip.setAttribute('aria-label', `Tag: ${tag.name}`);

  const label = document.createElement('span');
  label.textContent = tag.name;
  chip.appendChild(label);

  const remove = el('button', 'chip__remove');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Remover tag ${tag.name}`);
  remove.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>';
  remove.addEventListener('click', () => {
    void AppController.removeTag(chainId, tag.id);
  });
  chip.appendChild(remove);

  return chip;
}

function startNoteEdit(text: HTMLElement, note: NoteDTO, chainId: string): void {
  const original = note.content;
  text.contentEditable = 'true';
  text.focus();

  const range = document.createRange();
  range.selectNodeContents(text);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  const save = async (): Promise<void> => {
    text.contentEditable = 'false';
    const content = text.textContent?.trim() ?? '';
    if (!content) {
      text.textContent = original;
      return;
    }
    if (content === original) return;
    await AppController.updateNoteContent(chainId, note.id, content);
  };

  const onBlur = (): void => {
    void save();
  };
  text.addEventListener('blur', onBlur, { once: true });
  text.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      text.textContent = original;
      text.contentEditable = 'false';
      text.removeEventListener('blur', onBlur);
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      text.blur();
    }
  });
}

function renderNote(note: NoteDTO, chainId: string): HTMLElement {
  const article = el('article', 'chain-note');
  article.setAttribute('data-note-id', note.id);

  const meta = el('div', 'chain-note__meta');
  const role = el('span', `chain-note__role chain-note__role--${note.role}`);
  role.textContent = note.role === 'header' ? 'Início' : 'Nota';
  const time = el('time', 'chain-note__time');
  time.dateTime = note.createdAt;
  time.title = formatDateFull(note.createdAt);
  time.textContent = formatTime(note.createdAt);
  meta.append(role, time);

  if (note.updatedAt !== note.createdAt) {
    const edited = el('span', 'chain-note__edited');
    edited.textContent = 'editado';
    meta.appendChild(edited);
  }

  const edit = el('button', 'btn-icon chain-note__edit');
  edit.type = 'button';
  edit.setAttribute('aria-label', 'Editar nota');
  edit.title = 'Editar nota';
  edit.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span>';
  meta.appendChild(edit);

  const text = el('p', `chain-note__text chain-note__text--${note.role}`);
  text.textContent = note.content;
  edit.addEventListener('click', () => startNoteEdit(text, note, chainId));

  article.append(meta, text);
  return article;
}

export function mountChainDocument(
  tab: ChainTab,
  handlers: ChainDocumentHandlers
): ChainDocumentView {
  const root = el('section', 'chain-document');
  root.id = 'editor-panel';
  root.setAttribute('role', 'tabpanel');
  root.setAttribute('aria-label', `Cadeia ${tab.title}`);
  root.setAttribute('aria-labelledby', `editor-tab-${tab.id}`);

  root.innerHTML = `
    <header class="chain-document__header">
      <div class="chain-document__title-row">
        <h2 class="chain-document__title" contenteditable="true" role="textbox" aria-label="Título da cadeia" spellcheck="true"></h2>
        <div class="chain-document__actions">
          <button class="btn-icon" id="chain-favorite" type="button" aria-label="Alternar favorito" title="Alternar favorito"></button>
          <button class="btn-icon" id="chain-more" type="button" aria-label="Mais opções" title="Mais opções">
            <span class="material-symbols-rounded" aria-hidden="true">more_vert</span>
          </button>
        </div>
      </div>
      <div class="chain-document__meta">
        <div class="chain-document__tags" id="chain-tags" aria-label="Tags da cadeia"></div>
        <span class="chain-document__count" id="chain-note-count"></span>
      </div>
    </header>

    <div class="chain-document__scroll" id="chain-document-scroll">
      <div class="chain-document__history" id="chain-history"></div>
    </div>

    <div class="chain-composer" id="chain-composer">
      <div class="chain-composer__toolbar">
        <div class="chain-composer__title">
          <span class="chain-composer__icon material-symbols-rounded" aria-hidden="true">edit_note</span>
          <label class="chain-composer__label" for="chain-composer-input">Novo documento</label>
        </div>
        <span class="chain-composer__status" id="chain-composer-status" aria-live="polite"></span>
      </div>
      <textarea class="chain-composer__input" id="chain-composer-input" rows="3"
        placeholder="Adicione uma nota a esta cadeia..." aria-describedby="chain-composer-status"></textarea>
      <div class="chain-composer__footer">
        <span class="chain-composer__hint">Ctrl+S para adicionar</span>
        <button class="btn btn-filled" id="chain-composer-save" type="button">
          <span class="material-symbols-rounded" aria-hidden="true">add</span>
          <span id="chain-composer-save-label">Adicionar</span>
        </button>
      </div>
    </div>
  `;

  const title = root.querySelector<HTMLElement>('.chain-document__title')!;
  const favorite = root.querySelector<HTMLButtonElement>('#chain-favorite')!;
  const more = root.querySelector<HTMLButtonElement>('#chain-more')!;
  const tags = root.querySelector<HTMLElement>('#chain-tags')!;
  const count = root.querySelector<HTMLElement>('#chain-note-count')!;
  const scroll = root.querySelector<HTMLElement>('#chain-document-scroll')!;
  const history = root.querySelector<HTMLElement>('#chain-history')!;
  const composer = root.querySelector<HTMLTextAreaElement>('#chain-composer-input')!;
  const composerStatus = root.querySelector<HTMLElement>('#chain-composer-status')!;
  const save = root.querySelector<HTMLButtonElement>('#chain-composer-save')!;
  const saveLabel = root.querySelector<HTMLElement>('#chain-composer-save-label')!;

  let currentTab = tab;
  let titleTimer: ReturnType<typeof setTimeout> | null = null;
  let previousStatus = tab.status;
  let renderedNotesSignature = '';

  title.textContent = tab.title;

  title.addEventListener('input', () => {
    if (titleTimer) clearTimeout(titleTimer);
    titleTimer = setTimeout(() => {
      const next = title.textContent?.trim() ?? '';
      if (!next || next === currentTab.title) return;
      void AppController.updateChainTitle(currentTab.chainId, next);
    }, 800);
  });
  title.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    title.blur();
  });
  title.addEventListener('blur', () => {
    if (titleTimer) {
      clearTimeout(titleTimer);
      titleTimer = null;
    }
    const next = title.textContent?.trim() ?? '';
    if (!next) {
      title.textContent = currentTab.title;
      return;
    }
    if (next !== currentTab.title) {
      void AppController.updateChainTitle(currentTab.chainId, next);
    }
  });

  favorite.addEventListener('click', () => {
    void AppController.toggleFavorite(currentTab.chainId);
  });
  more.addEventListener('click', (event) => {
    showChainMenu(event, currentTab.chainId);
  });

  const renderTags = (): void => {
    tags.innerHTML = '';
    const summary = appState.get().chainSummaries.find(
      (chain) => chain.id === currentTab.chainId
    );

    (summary?.tags ?? []).forEach((tag) => {
      tags.appendChild(renderTagChip(tag, currentTab.chainId));
    });

    const add = el('button', 'chip');
    add.type = 'button';
    add.setAttribute('aria-label', 'Adicionar tag');
    add.innerHTML =
      '<span class="material-symbols-rounded icon-md" aria-hidden="true">add</span> Tag';
    add.addEventListener('click', async () => {
      const name = await showInputDialog({
        title: 'Adicionar tag',
        label: 'Nome da tag',
        placeholder: 'ex: projeto',
        confirmLabel: 'Adicionar',
      });
      if (name) void AppController.assignTag(currentTab.chainId, name);
    });
    tags.appendChild(add);

    const isFavorite = summary?.isFavorite ?? false;
    favorite.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${
      isFavorite ? 'star' : 'star_border'
    }</span>`;
    favorite.setAttribute('aria-pressed', isFavorite ? 'true' : 'false');
    favorite.title = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    favorite.classList.toggle('btn-icon--active', isFavorite);
  };

  const renderNotes = (): void => {
    const signature = currentTab.notes
      .map((note) => `${note.id}:${note.updatedAt}`)
      .join('|');

    count.textContent = `${currentTab.notes.length} ${
      currentTab.notes.length === 1 ? 'nota' : 'notas'
    }`;

    if (
      (currentTab.status === 'loading' || currentTab.status === 'idle') &&
      currentTab.notes.length === 0
    ) {
      history.innerHTML = '';
      history.appendChild(renderLoadingState());
      renderedNotesSignature = signature;
      return;
    }

    if (currentTab.status === 'error') {
      history.innerHTML = '';
      const error = renderEmptyDetail(
        'error',
        'Não foi possível carregar a cadeia',
        'Verifique a conexão com os dados locais e tente novamente.'
      );
      const retry = el('button', 'btn btn-text');
      retry.type = 'button';
      retry.textContent = 'Tentar novamente';
      retry.addEventListener('click', () => {
        void AppController.loadEditorChainTab(currentTab.id, currentTab.chainId, true);
      });
      error.appendChild(retry);
      history.appendChild(error);
      renderedNotesSignature = signature;
      return;
    }

    if (signature === renderedNotesSignature && currentTab.status === previousStatus) {
      return;
    }

    const previousScroll = scroll.scrollTop;
    history.innerHTML = '';

    if (currentTab.notes.length === 0) {
      history.appendChild(
        renderEmptyDetail(
          'edit_note',
          'Nenhuma nota ainda',
          'Escreva a primeira nota no compositor abaixo.'
        )
      );
    } else {
      groupNotesByDate(currentTab.notes).forEach((group) => {
        const section = el('section', 'chain-date-group');
        section.setAttribute('aria-label', group.fullLabel);

        const heading = el('h3', 'chain-date-group__label');
        heading.textContent = group.label;
        heading.title = group.fullLabel;
        section.appendChild(heading);

        group.notes.forEach((note) => {
          section.appendChild(renderNote(note, currentTab.chainId));
        });

        history.appendChild(section);
      });
    }

    renderedNotesSignature = signature;
    scroll.scrollTop = previousScroll;
  };

  const syncComposer = (): void => {
    const dirty = composer.value !== currentTab.savedComposer;
    composerStatus.textContent = dirty
      ? 'Alterações não salvas'
      : currentTab.composer
        ? 'Pronto para adicionar'
        : '';
    composerStatus.classList.toggle('chain-composer__status--dirty', dirty);
  };

  composer.addEventListener('input', () => {
    currentTab = { ...currentTab, composer: composer.value };
    handlers.onComposerInput(composer.value);
    syncComposer();
  });
  composer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    handlers.onAppend();
  });
  save.addEventListener('click', () => handlers.onAppend());

  const update = (tabValue: ChainTab): void => {
    const justLoaded =
      previousStatus === 'loading' && tabValue.status === 'loaded';
    currentTab = tabValue;

    if (title !== document.activeElement) {
      title.textContent = tabValue.title;
    }
    root.setAttribute('aria-label', `Cadeia ${tabValue.title}`);
    root.dataset['chainId'] = tabValue.chainId;

    renderTags();
    renderNotes();

    if (composer !== document.activeElement) {
      composer.value = tabValue.composer;
    }
    syncComposer();

    if (justLoaded) {
      requestAnimationFrame(() => {
        scroll.scrollTop = scroll.scrollHeight;
      });
    }

    previousStatus = tabValue.status;
  };

  const setSaving = (saving: boolean): void => {
    save.disabled = saving;
    composer.disabled = saving;
    saveLabel.textContent = saving ? 'Adicionando...' : 'Adicionar';
    const icon = save.querySelector<HTMLElement>('.material-symbols-rounded');
    if (icon) icon.textContent = saving ? 'hourglass_top' : 'add';
  };

  const clearComposerIf = (content: string): void => {
    if (composer.value !== content) return;
    composer.value = '';
    currentTab = { ...currentTab, composer: '' };
    handlers.onComposerInput('');
    syncComposer();
  };

  const destroy = (): void => {
    if (titleTimer) clearTimeout(titleTimer);
  };

  update(tab);

  requestAnimationFrame(() => {
    if (tab.status === 'loaded') scroll.scrollTop = scroll.scrollHeight;
  });

  return {
    element: root,
    update,
    setSaving,
    clearComposerIf,
    focusComposer: () => composer.focus(),
    destroy,
  };
}
