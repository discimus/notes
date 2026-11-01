import type { NoteContentType, NoteDTO } from '@application/dto/index.js';
import type { ChainNoteTab, ChainTab } from '../state/EditorStore.js';
import {
  contentTypeOf,
  deriveEditorTitle,
  isChainNoteTabDirty,
} from '../state/EditorStore.js';
import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { groupNotesByDate } from '../app/editorGrouping.js';
import { renderEmptyDetail, renderLoadingState } from './states.js';
import { showChainMenu } from '../views/menus.js';
import { renderTabList } from './EditorTabs.js';
import { mountActiveLineHighlight } from './ActiveLineHighlight.js';
import { mountInlineTagEditor } from './InlineTagEditor.js';
import { mountContentTypeMenu } from './ContentTypeMenu.js';
import { renderQuickActions } from './QuickActions.js';
import { el } from '../dom.js';
import { formatDateFull, formatTime } from '@shared/utilities/index.js';

const COMPACT_SCROLL_MIN = 24;
const COMPACT_DELTA_MIN = 4;
const EXPAND_DELTA_MIN = 8;
const EXPAND_DELAY_MS = 120;
const SCROLL_IGNORE_MS = 100;

export interface ChainDocumentHandlers {
  onNoteInput: (noteTabId: string, value: string) => void;
  onContentTypeChange?: (noteTabId: string, contentType: NoteContentType) => void;
  onSaveNote: (noteTabId: string) => void;
  onCreateNote: () => void;
  onSelectNote: (noteTabId: string) => void;
  onCloseNote: (noteTabId: string) => void;
  onNewDocument?: () => void;
  onCollapseComposer?: () => void;
  onImportFiles?: (files: File[]) => void;
  onRename?: () => void;
}

export interface ChainDocumentView {
  element: HTMLElement;
  update: (tab: ChainTab) => void;
  setSaving: (saving: boolean) => void;
  focusNoteEditor: () => void;
  destroy: () => void;
}

function noteTabLabel(noteTab: ChainNoteTab): string {
  const title = deriveEditorTitle(noteTab.content);
  return title === 'Sem título' ? 'Novo documento' : title;
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

function startCodeNoteEdit(text: HTMLElement, note: NoteDTO, chainId: string): void {
  const original = note.content;
  const editor = el('textarea', 'chain-note__code-editor') as HTMLTextAreaElement;
  editor.value = original;
  editor.rows = Math.min(24, Math.max(4, original.split(/\r?\n/).length + 1));
  editor.spellcheck = false;
  editor.setAttribute('aria-label', 'Editar código da nota');

  let finished = false;
  const restore = (): void => {
    if (editor.parentElement) editor.replaceWith(text);
  };
  const save = async (): Promise<void> => {
    if (finished) return;
    finished = true;
    const content = editor.value;

    if (!content.trim()) {
      restore();
      return;
    }
    if (content !== original) {
      await AppController.updateNoteContent(chainId, note.id, content, 'code');
    }
    restore();
  };

  text.replaceWith(editor);
  editor.focus();
  editor.setSelectionRange(original.length, original.length);

  editor.addEventListener('blur', () => {
    void save();
  }, { once: true });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finished = true;
      restore();
      return;
    }
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void save();
    }
  });
}

function renderNote(note: NoteDTO, chainId: string): HTMLElement {
  const article = el('article', 'chain-note');
  article.setAttribute('data-note-id', note.id);

  const meta = el('div', 'chain-note__meta');
  if (note.role === 'header') {
    const role = el('span', 'chain-note__role chain-note__role--header');
    role.textContent = 'Início';
    meta.appendChild(role);
  }
  const time = el('time', 'chain-note__time');
  time.dateTime = note.createdAt;
  time.title = formatDateFull(note.createdAt);
  time.textContent = formatTime(note.createdAt);
  meta.append(time);

  if (note.updatedAt !== note.createdAt) {
    const edited = el('span', 'chain-note__edited');
    edited.textContent = 'editado';
    meta.appendChild(edited);
  }

  const isCode = note.contentType === 'code';
  if (isCode) {
    const format = el('span', 'chain-note__format');
    format.textContent = 'Código';
    meta.appendChild(format);
  }

  const edit = el('button', 'btn-icon chain-note__edit');
  edit.type = 'button';
  edit.setAttribute('aria-label', 'Editar nota');
  edit.title = 'Editar nota';
  edit.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span>';
  meta.appendChild(edit);

  const text = el(
    'p',
    `chain-note__text chain-note__text--${note.role}${isCode ? ' chain-note__text--code' : ''}`
  );
  text.textContent = note.content;
  edit.addEventListener('click', () => {
    if (isCode) startCodeNoteEdit(text, note, chainId);
    else startNoteEdit(text, note, chainId);
  });

  const body = el(
    'div',
    `chain-note__body${isCode ? ' chain-note__body--code' : ''}`
  );
  body.appendChild(text);
  article.append(meta, body);
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
      <div class="chain-document__meta">
        <div class="chain-document__tags" id="chain-tags" aria-label="Tags da cadeia"></div>
        <span class="chain-document__count" id="chain-note-count"></span>
        <div class="chain-document__actions">
          <button class="btn-icon" id="chain-import-file" type="button"
            aria-label="Importar documento para esta cadeia" title="Importar documento">
            <span class="material-symbols-rounded" aria-hidden="true">upload_file</span>
          </button>
          <input id="chain-file-input" type="file" multiple hidden />
          <button class="btn-icon" id="chain-more" type="button" aria-label="Mais opções" title="Mais opções">
            <span class="material-symbols-rounded" aria-hidden="true">more_vert</span>
          </button>
        </div>
      </div>
    </header>

    <div class="chain-document__scroll" id="chain-document-scroll">
      <div class="chain-document__history" id="chain-history"></div>
    </div>

    <div class="chain-composer" id="chain-composer">
      <div class="chain-composer__body" id="chain-composer-body">
        <div class="chain-note-tabbar">
          <div class="editor-tabs editor-tabs--nested" id="chain-note-tabs"></div>
          <button class="btn-icon" id="chain-note-new" type="button" aria-label="Novo documento" title="Novo documento">
            <span class="material-symbols-rounded" aria-hidden="true">add</span>
          </button>
        </div>

        <div class="chain-note-editor" id="chain-note-panel" role="tabpanel">
          <textarea class="chain-composer__input" id="chain-composer-input"
            placeholder="Escreva uma nova nota para esta cadeia..."
            aria-label="Conteúdo da nota"></textarea>
          <div class="chain-note-empty" id="chain-note-empty" hidden>
            <span class="material-symbols-rounded chain-note-empty__icon" aria-hidden="true">edit_note</span>
            <p class="chain-note-empty__title">Nenhuma nota em edição</p>
            <p class="chain-note-empty__body">Crie um novo documento para adicionar à cadeia.</p>
            <button class="btn btn-tonal" id="chain-note-empty-new" type="button">
              <span class="material-symbols-rounded" aria-hidden="true">add</span>
              Novo documento
            </button>
          </div>
        </div>

        <div class="chain-composer__footer">
          <span class="chain-composer__status" id="chain-composer-status" aria-live="polite"></span>
          <div class="chain-composer__actions">
            <span id="chain-content-type"></span>
            <span class="chain-composer__hint">Ctrl+S para adicionar</span>
            <button class="btn btn-filled" id="chain-composer-save" type="button">
              <span class="material-symbols-rounded" aria-hidden="true">add</span>
              <span id="chain-composer-save-label">Adicionar</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <footer class="chain-document__footer">
      ${renderQuickActions({
        documentId: 'chain-action-document',
        groupId: 'chain-quick-actions',
        badgeId: 'chain-unsaved-badge',
        controls: 'chain-composer-body',
        expanded: false,
      })}
    </footer>

    <div class="chain-document__drop-overlay" id="chain-drop-overlay" hidden aria-hidden="true">
      <span class="material-symbols-rounded chain-document__drop-icon" aria-hidden="true">upload_file</span>
      <span class="chain-document__drop-text">Solte para importar nesta cadeia</span>
    </div>
  `;

  const more = root.querySelector<HTMLButtonElement>('#chain-more')!;
  const importButton = root.querySelector<HTMLButtonElement>('#chain-import-file')!;
  const fileInput = root.querySelector<HTMLInputElement>('#chain-file-input')!;
  const dropOverlay = root.querySelector<HTMLElement>('#chain-drop-overlay')!;
  const header = root.querySelector<HTMLElement>('.chain-document__header')!;
  const documentAction = root.querySelector<HTMLButtonElement>('#chain-action-document')!;
  const unsavedBadge = root.querySelector<HTMLElement>('#chain-unsaved-badge')!;
  const tags = root.querySelector<HTMLElement>('#chain-tags')!;
  const count = root.querySelector<HTMLElement>('#chain-note-count')!;
  const scroll = root.querySelector<HTMLElement>('#chain-document-scroll')!;
  const history = root.querySelector<HTMLElement>('#chain-history')!;
  const noteTabs = root.querySelector<HTMLElement>('#chain-note-tabs')!;
  const newNote = root.querySelector<HTMLButtonElement>('#chain-note-new')!;
  const emptyNewNote = root.querySelector<HTMLButtonElement>('#chain-note-empty-new')!;
  const panel = root.querySelector<HTMLElement>('#chain-note-panel')!;
  const composer = root.querySelector<HTMLTextAreaElement>('#chain-composer-input')!;
  const emptyNote = root.querySelector<HTMLElement>('#chain-note-empty')!;
  const composerStatus = root.querySelector<HTMLElement>('#chain-composer-status')!;
  const contentTypeHost = root.querySelector<HTMLElement>('#chain-content-type')!;
  const save = root.querySelector<HTMLButtonElement>('#chain-composer-save')!;
  const saveLabel = root.querySelector<HTMLElement>('#chain-composer-save-label')!;
  const activeLine = mountActiveLineHighlight(composer, panel);
  const composerShell = root.querySelector<HTMLElement>('#chain-composer')!;
  const composerBody = root.querySelector<HTMLElement>('#chain-composer-body')!;

  let currentTab = tab;
  const tagEditor = mountInlineTagEditor(tags, {
    onAdd: (name) => AppController.assignTag(currentTab.chainId, name),
    onRemove: (tag) => {
      void AppController.removeTag(currentTab.chainId, tag.id);
    },
  });
  let previousStatus = tab.status;
  let renderedNotesSignature = '__initial__';
  let renderedNoteTabId: string | null = null;
  let savingState = false;

  more.addEventListener('click', (event) => {
    showChainMenu(
      event,
      currentTab.chainId,
      handlers.onRename ? { onRename: handlers.onRename } : {}
    );
  });
  const syncComposerState = (tabValue: ChainTab): void => {
    const dirtyCount = tabValue.noteTabs.filter(isChainNoteTabDirty).length;
    const dirty = dirtyCount > 0;
    const collapsed = tabValue.composerCollapsed;

    root.classList.toggle('chain-document--notes-collapsed', collapsed);
    composerBody.hidden = collapsed;
    documentAction.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    unsavedBadge.hidden = !dirty;
    documentAction.setAttribute(
      'aria-label',
      dirtyCount > 0
        ? `Documento, ${dirtyCount} ${dirtyCount === 1 ? 'nota não salva' : 'notas não salvas'}`
        : 'Documento'
    );
    documentAction.title =
      dirtyCount > 0 ? 'Documento · há notas não salvas' : 'Documento';
  };

  const renderTags = (): void => {
    const summary = appState.get().chainSummaries.find(
      (chain) => chain.id === currentTab.chainId
    );

    tagEditor.update(summary?.tags ?? [], appState.get().allTags);
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
          'Escreva a primeira nota nas abas abaixo.'
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

  const activeNoteTab = (): ChainNoteTab | null =>
    currentTab.noteTabs.find((item) => item.id === currentTab.activeNoteTabId) ??
    null;

  const contentTypeMenu = mountContentTypeMenu({
    value: contentTypeOf(
      tab.noteTabs.find((item) => item.id === tab.activeNoteTabId) ?? {
        contentType: 'text',
      }
    ),
    onChange: (contentType) => {
      const active = activeNoteTab();
      if (!active) return;
      currentTab = {
        ...currentTab,
        noteTabs: currentTab.noteTabs.map((noteTab) =>
          noteTab.id === active.id ? { ...noteTab, contentType } : noteTab
        ),
      };
      handlers.onContentTypeChange?.(active.id, contentType);
      syncNoteEditor();
      renderNoteTabs();
      activeLine.refresh();
    },
  });
  contentTypeHost.appendChild(contentTypeMenu.element);

  const syncNoteEditor = (): void => {
    const noteTab = activeNoteTab();

    if (!noteTab) {
      renderedNoteTabId = null;
      composer.hidden = true;
      composer.value = '';
      emptyNote.hidden = false;
      contentTypeMenu.element.hidden = true;
      panel.removeAttribute('aria-labelledby');
      save.disabled = true;
      composer.disabled = savingState;
      composerStatus.textContent = '';
      activeLine.refresh();
      return;
    }

    const isCode = contentTypeOf(noteTab) === 'code';
    composer.hidden = false;
    emptyNote.hidden = true;
    contentTypeMenu.element.hidden = false;
    contentTypeMenu.update(isCode ? 'code' : 'text');
    composer.classList.toggle('chain-composer__input--code', isCode);
    composer.spellcheck = !isCode;
    composer.placeholder = isCode
      ? 'Escreva um trecho de código...'
      : 'Escreva uma nova nota para esta cadeia...';
    panel.setAttribute('aria-labelledby', `editor-tab-${noteTab.id}`);
    save.disabled = savingState;
    composer.disabled = savingState;

    if (renderedNoteTabId !== noteTab.id) {
      composer.value = noteTab.content;
      renderedNoteTabId = noteTab.id;
    } else if (composer !== document.activeElement && composer.value !== noteTab.content) {
      composer.value = noteTab.content;
    }

    composerStatus.textContent = isChainNoteTabDirty(noteTab)
      ? 'Pronto para adicionar'
      : '';
    activeLine.refresh();
  };

  const renderNoteTabs = (): void => {
    const items = currentTab.noteTabs.map((noteTab) => ({
      id: noteTab.id,
      label: noteTabLabel(noteTab),
      icon: contentTypeOf(noteTab) === 'code' ? 'code' : 'edit_note',
      dirty: isChainNoteTabDirty(noteTab),
    }));

    renderTabList(
      noteTabs,
      items,
      currentTab.activeNoteTabId,
      {
        onSelect: handlers.onSelectNote,
        onClose: handlers.onCloseNote,
        onCreate: handlers.onCreateNote,
      },
      {
        panelId: 'chain-note-panel',
        ariaLabel: 'Notas pendentes',
      }
    );
  };

  composer.addEventListener('input', () => {
    const active = activeNoteTab();
    if (!active) return;

    currentTab = {
      ...currentTab,
      noteTabs: currentTab.noteTabs.map((noteTab) =>
        noteTab.id === active.id ? { ...noteTab, content: composer.value } : noteTab
      ),
    };
    handlers.onNoteInput(active.id, composer.value);
    renderNoteTabs();
    syncNoteEditor();
  });
  composer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    const active = activeNoteTab();
    if (active) handlers.onSaveNote(active.id);
  });

  documentAction.addEventListener('click', () => handlers.onNewDocument?.());
  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (currentTab.composerCollapsed) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (composerShell.contains(target) || documentAction.contains(target)) return;
    if (
      target instanceof Element &&
      target.closest(
        '[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"], .chain-menu, .snackbar-container'
      )
    ) {
      return;
    }
    handlers.onCollapseComposer?.();
  };
  document.addEventListener('pointerdown', onDocumentPointerDown);
  newNote.addEventListener('click', handlers.onCreateNote);
  emptyNewNote.addEventListener('click', handlers.onCreateNote);
  save.addEventListener('click', () => {
    const active = activeNoteTab();
    if (active) handlers.onSaveNote(active.id);
  });

  let actionsCompact = false;
  let lastScrollTop = scroll.scrollTop;
  let upwardDistance = 0;
  let expandTimer: ReturnType<typeof setTimeout> | null = null;
  let compactFrame: number | null = null;
  let ignoreCompactUntil = 0;

  const cancelExpand = (): void => {
    if (expandTimer !== null) clearTimeout(expandTimer);
    expandTimer = null;
  };

  const setActionsCompact = (value: boolean): void => {
    const changed = actionsCompact !== value;
    actionsCompact = value;
    if (changed) {
      root.classList.toggle('chain-document--actions-compact', value);
      root.classList.toggle('chain-document--date-hidden', value);
    }
    const headerFocused = header.contains(document.activeElement);
    root.classList.toggle('chain-document--header-hidden', value && !headerFocused);
  };

  const scrollToBottom = (): void => {
    ignoreCompactUntil = Date.now() + SCROLL_IGNORE_MS;
    scroll.scrollTop = scroll.scrollHeight;
    lastScrollTop = scroll.scrollTop;
  };

  const onScroll = (): void => {
    if (compactFrame !== null) return;

    compactFrame = requestAnimationFrame(() => {
      compactFrame = null;

      if (Date.now() < ignoreCompactUntil) {
        lastScrollTop = scroll.scrollTop;
        return;
      }

      const current = scroll.scrollTop;
      const delta = current - lastScrollTop;
      lastScrollTop = current;

      if (current <= 8) {
        cancelExpand();
        upwardDistance = 0;
        setActionsCompact(false);
        return;
      }

      if (delta > COMPACT_DELTA_MIN && current > COMPACT_SCROLL_MIN) {
        cancelExpand();
        upwardDistance = 0;
        setActionsCompact(true);
        return;
      }

      if (delta < 0 && actionsCompact) {
        upwardDistance += Math.abs(delta);
        if (upwardDistance >= EXPAND_DELTA_MIN && expandTimer === null) {
          expandTimer = setTimeout(() => {
            expandTimer = null;
            setActionsCompact(false);
          }, EXPAND_DELAY_MS);
        }
      } else if (delta > 0) {
        cancelExpand();
        upwardDistance = 0;
      }
    });
  };

  scroll.addEventListener('scroll', onScroll);

  const update = (tabValue: ChainTab): void => {
    const justLoaded =
      previousStatus === 'loading' && tabValue.status === 'loaded';
    currentTab = tabValue;
    root.setAttribute('aria-label', `Cadeia ${tabValue.title}`);
    root.dataset['chainId'] = tabValue.chainId;

    syncComposerState(tabValue);
    renderTags();
    renderNotes();
    renderNoteTabs();
    syncNoteEditor();

    if (justLoaded) {
      requestAnimationFrame(scrollToBottom);
    }

    previousStatus = tabValue.status;
  };

  const setSaving = (saving: boolean): void => {
    savingState = saving;
    newNote.disabled = saving;
    emptyNewNote.disabled = saving;
    saveLabel.textContent = saving ? 'Adicionando...' : 'Adicionar';
    const icon = save.querySelector<HTMLElement>('.material-symbols-rounded');
    if (icon) icon.textContent = saving ? 'hourglass_top' : 'add';
    syncNoteEditor();
  };

  let fileDragDepth = 0;

  const hasFilePayload = (event: DragEvent): boolean =>
    Array.from(event.dataTransfer?.types ?? []).includes('Files');

  const setDropActive = (active: boolean): void => {
    root.classList.toggle('chain-document--drop-target', active);
    dropOverlay.hidden = !active;
  };

  const resetFileDrag = (): void => {
    fileDragDepth = 0;
    setDropActive(false);
  };

  importButton.addEventListener('click', () => {
    if (handlers.onImportFiles) fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    const files = fileInput.files ? [...fileInput.files] : [];
    fileInput.value = '';
    if (files.length > 0) handlers.onImportFiles?.(files);
  });

  root.addEventListener('dragenter', (event) => {
    if (!handlers.onImportFiles || !hasFilePayload(event)) return;
    event.preventDefault();
    fileDragDepth += 1;
    setDropActive(true);
  });
  root.addEventListener('dragover', (event) => {
    if (!handlers.onImportFiles || !hasFilePayload(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  });
  root.addEventListener('dragleave', (event) => {
    if (!handlers.onImportFiles || fileDragDepth === 0) return;
    event.preventDefault();
    fileDragDepth = Math.max(0, fileDragDepth - 1);
    if (fileDragDepth === 0) setDropActive(false);
  });
  root.addEventListener('drop', (event) => {
    if (!handlers.onImportFiles || !hasFilePayload(event)) return;
    event.preventDefault();
    event.stopPropagation();
    resetFileDrag();
    const files = event.dataTransfer ? [...event.dataTransfer.files] : [];
    if (files.length > 0) handlers.onImportFiles(files);
  });
  const resetWhenLeavingWindow = (event: DragEvent): void => {
    if (event.relatedTarget === null) resetFileDrag();
  };

  window.addEventListener('dragend', resetFileDrag);
  window.addEventListener('drop', resetFileDrag, true);
  window.addEventListener('dragleave', resetWhenLeavingWindow);

  const destroy = (): void => {
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    scroll.removeEventListener('scroll', onScroll);
    cancelExpand();
    if (compactFrame !== null) cancelAnimationFrame(compactFrame);
    compactFrame = null;
    window.removeEventListener('dragend', resetFileDrag);
    window.removeEventListener('drop', resetFileDrag, true);
    window.removeEventListener('dragleave', resetWhenLeavingWindow);
    contentTypeMenu.destroy();
    activeLine.destroy();
    tagEditor.destroy();
  };

  update(tab);

  requestAnimationFrame(() => {
    if (tab.status === 'loaded') scrollToBottom();
  });

  return {
    element: root,
    update,
    setSaving,
    focusNoteEditor: () => {
      if (currentTab.composerCollapsed) {
        documentAction.focus();
        return;
      }
      const noteTab = activeNoteTab();
      if (noteTab) composer.focus();
      else newNote.focus();
    },
    destroy,
  };
}
