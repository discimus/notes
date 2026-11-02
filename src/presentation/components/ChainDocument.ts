import type {
  AttachmentDTO,
  NoteContentType,
  NoteDTO,
  TagDTO,
} from '@application/dto/index.js';
import type { ChainNoteTab, ChainTab } from '../state/EditorStore.js';
import {
  contentTypeOf,
  deriveEditorTitle,
  isChainNoteTabDirty,
} from '../state/EditorStore.js';
import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import {
  isVerbatimContentType,
  NOTE_CONTENT_TYPE_META,
} from '../app/noteContentTypes.js';
import {
  buildNotePeriods,
  groupNotesByDate,
  type NotePeriodMonth,
  type NotePeriodYear,
} from '../app/editorGrouping.js';
import { renderEmptyDetail, renderLoadingState } from './states.js';
import { showChainMenu } from '../views/menus.js';
import { renderTabList } from './EditorTabs.js';
import { mountActiveLineHighlight } from './ActiveLineHighlight.js';
import { mountInlineTagEditor } from './InlineTagEditor.js';
import type { InlineTagEditorView } from './InlineTagEditor.js';
import { mountContentTypeMenu } from './ContentTypeMenu.js';
import { mountPeriodMenu } from './PeriodMenu.js';
import { renderQuickActions } from './QuickActions.js';
import { renderLinkedText } from './LinkedText.js';
import { renderMarkdownContent } from './MarkdownContent.js';
import { highlightTextInElement } from './SearchHighlight.js';
import { stopAttachmentAudio, renderNoteAttachments } from './NoteAttachments.js';
import { stopAllAudioCascades } from './audioList.js';
import { releaseAllAttachmentUrls } from './attachmentUrls.js';
import { pickImagesWithClipboardFallback } from './imageAttachmentInput.js';
import { el } from '../dom.js';
import {
  findMatchRange,
  formatDateFull,
  formatTime,
} from '@shared/utilities/index.js';

const COMPACT_SCROLL_MIN = 24;
const COMPACT_DELTA_MIN = 4;
const EXPAND_DELTA_MIN = 8;
const EXPAND_DELAY_MS = 120;
const SCROLL_IGNORE_MS = 100;
const PREVIEW_DOUBLE_CLICK_MS = 500;
const PERIOD_FLASH_MS = 1200;
const PERIOD_HIGHLIGHT_MS = 5000;
const PERIOD_HIGHLIGHT_FADE_MS = 300;

export interface ChainDocumentHandlers {
  onNoteInput: (noteTabId: string, value: string) => void;
  onContentTypeChange?: (noteTabId: string, contentType: NoteContentType) => void;
  onSaveNote: (noteTabId: string) => void;
  onEditNote?: (
    noteId: string,
    options?: { focus?: boolean; preview?: boolean }
  ) => void;
  onAddNoteImages?: (noteId: string, files: File[]) => void;
  onAddNoteAudio?: (noteId: string) => void;
  onAddChainImages?: (files: File[]) => void;
  onAddChainAudio?: () => void;
  onPasteText?: () => void;
  onDeleteNoteAttachment?: (noteId: string, attachment: AttachmentDTO) => void;
  onDeleteNote?: (noteId: string) => void;
  onAddNoteTag?: (noteId: string, tagName: string) => Promise<boolean>;
  onRemoveNoteTag?: (noteId: string, tag: TagDTO) => void;
  onCreateNote: () => void;
  onSelectNote: (noteTabId: string) => void;
  onCloseNote: (noteTabId: string) => void;
  onNewDocument?: () => void;
  onImportFiles?: (files: File[]) => void;
  onRename?: () => void;
}

export interface ChainDocumentView {
  element: HTMLElement;
  update: (tab: ChainTab) => void;
  setSaving: (saving: boolean) => void;
  focusNoteEditor: () => void;
  focusSearchMatch: (query: string) => void;
  destroy: () => void;
}

function noteTabLabel(noteTab: ChainNoteTab): string {
  const title = deriveEditorTitle(noteTab.content);
  if (noteTab.editingNoteId) {
    return title === 'Sem título' ? 'Nota em edição' : title;
  }
  return title === 'Sem título' ? 'Novo documento' : title;
}

interface NoteRenderHandlers {
  onEdit?: (noteId: string, options?: { focus?: boolean; preview?: boolean }) => void;
  onAddImages?: (noteId: string, files: File[]) => void;
  onAddAudio?: (noteId: string) => void;
  onDelete?: (noteId: string) => void;
  onDeleteAttachment?: (noteId: string, attachment: AttachmentDTO) => void;
  showTags?: boolean;
}

function hasImageFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  const items = [...dataTransfer.items];
  if (items.length > 0) {
    return items.some((item) => item.kind === 'file' && item.type.startsWith('image/'));
  }
  return [...dataTransfer.files].some((file) => file.type.startsWith('image/'));
}

function imageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  return [...dataTransfer.files].filter((file) => file.type.startsWith('image/'));
}

function renderNote(
  note: NoteDTO,
  editing: boolean,
  selected: boolean,
  handlers: NoteRenderHandlers
): HTMLElement {
  const article = el('article', 'chain-note');
  article.setAttribute('data-note-id', note.id);
  article.setAttribute('aria-label', `Nota de ${formatDateFull(note.createdAt)}`);
  article.tabIndex = -1;
  article.classList.toggle('chain-note--selected', selected);
  article.setAttribute('aria-current', selected ? 'true' : 'false');

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

  const type = contentTypeOf(note);
  const metaInfo = NOTE_CONTENT_TYPE_META[type];
  const isCode = type === 'code';
  const isMarkdown = type === 'markdown';
  const verbatim = isVerbatimContentType(type);
  if (verbatim) {
    const format = el('span', 'chain-note__format');
    format.textContent = metaInfo.label;
    meta.appendChild(format);
  }

  if (editing) {
    const editingBadge = el('span', 'chain-note__editing');
    editingBadge.textContent = 'Em edição';
    meta.appendChild(editingBadge);
  }

  const actions = el('div', 'chain-note__actions');

  const edit = el('button', 'btn-icon chain-note__edit');
  edit.type = 'button';
  edit.setAttribute('aria-label', 'Editar nota');
  edit.title = 'Editar nota';
  edit.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span>';
  edit.addEventListener('click', () => handlers.onEdit?.(note.id));

  const addImage = el('button', 'btn-icon chain-note__attach chain-note__attach--image');
  addImage.type = 'button';
  addImage.setAttribute('aria-label', 'Adicionar imagem a esta nota');
  addImage.title = 'Adicionar imagem a esta nota';
  addImage.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">image</span>';
  addImage.addEventListener('click', () => {
    void pickImagesWithClipboardFallback((files) => {
      handlers.onAddImages?.(note.id, files);
    });
  });

  const addAudio = el('button', 'btn-icon chain-note__attach chain-note__attach--audio');
  addAudio.type = 'button';
  addAudio.setAttribute('aria-label', 'Gravar A�udio nesta nota');
  addAudio.title = 'Gravar A�udio nesta nota';
  addAudio.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">mic</span>';
  addAudio.addEventListener('click', () => handlers.onAddAudio?.(note.id));

  const remove = el('button', 'btn-icon chain-note__delete');
  remove.type = 'button';
  remove.setAttribute('aria-label', 'Excluir nota');
  remove.title = 'Excluir nota';
  remove.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">delete</span>';
  remove.addEventListener('click', () => handlers.onDelete?.(note.id));

  actions.append(edit, addImage, addAudio, remove);
  meta.appendChild(actions);

  const noteTags = note.tags ?? [];
  let tagsRow: HTMLElement | null = null;
  if (noteTags.length > 0 || handlers.showTags) {
    tagsRow = el('div', 'chain-note__tags');
    tagsRow.setAttribute('role', 'group');
    tagsRow.setAttribute('aria-label', 'Tags da nota');
    tagsRow.dataset['noteTagsHost'] = 'true';
    tagsRow.dataset['noteId'] = note.id;
    meta.insertBefore(tagsRow, actions);
  }

  const text = el(
    isMarkdown ? 'div' : 'p',
    `chain-note__text chain-note__text--${note.role}${
      isCode ? ' chain-note__text--code chain-note__text--verbatim' : ''
    }${isMarkdown ? ' chain-note__text--markdown note-markdown' : ''}`
  );
  if (isMarkdown) renderMarkdownContent(text, note.content);
  else renderLinkedText(text, note.content);

  const body = el(
    'div',
    `chain-note__body${
      isCode ? ' chain-note__body--code chain-note__body--verbatim' : ''
    }${isMarkdown ? ' chain-note__body--markdown' : ''}`
  );
  body.title = 'Clique para abrir; clique duas vezes para manter a aba aberta.';
  body.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (target?.closest('a, button')) return;
    handlers.onEdit?.(note.id, { preview: event.detail < 2 });
  });

  const setDropTarget = (active: boolean): void => {
    article.classList.toggle('chain-note--drop-target', active);
  };
  article.addEventListener('dragenter', (event) => {
    if (!hasImageFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(true);
  });
  article.addEventListener('dragover', (event) => {
    if (!hasImageFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setDropTarget(true);
  });
  article.addEventListener('dragleave', (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && article.contains(related)) return;
    setDropTarget(false);
  });
  article.addEventListener('drop', (event) => {
    const files = imageFiles(event.dataTransfer);
    if (files.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(false);
    handlers.onAddImages?.(note.id, files);
  });

  body.appendChild(text);
  if (note.attachments && note.attachments.length > 0) {
    renderNoteAttachments(
      body,
      note.attachments,
      {
        onDelete: (attachment) =>
          handlers.onDeleteAttachment?.(note.id, attachment),
      },
      { previewImageLimit: 3 }
    );
  }
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

    <div class="chain-document__body">
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
    </div>

    <p class="sr-only" id="chain-period-status" role="status" aria-live="polite"></p>

    <footer class="chain-document__footer">
      ${renderQuickActions({
        documentId: 'chain-action-document',
        groupId: 'chain-quick-actions',
          badgeId: 'chain-unsaved-badge',
          controls: 'chain-composer-body',
          expanded: false,
          imageId: 'chain-action-image',
          audioId: 'chain-action-audio',
          linkId: 'chain-action-link',
          pasteEnabled: Boolean(handlers.onPasteText),
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
  const quickImage = root.querySelector<HTMLButtonElement>('#chain-action-image')!;
  const quickAudio = root.querySelector<HTMLButtonElement>('#chain-action-audio')!;
  const quickLink = root.querySelector<HTMLButtonElement>('#chain-action-link')!;
  const unsavedBadge = root.querySelector<HTMLElement>('#chain-unsaved-badge')!;
  const tags = root.querySelector<HTMLElement>('#chain-tags')!;
  const count = root.querySelector<HTMLElement>('#chain-note-count')!;
  const scroll = root.querySelector<HTMLElement>('#chain-document-scroll')!;
  const history = root.querySelector<HTMLElement>('#chain-history')!;
  const periodStatus = root.querySelector<HTMLElement>('#chain-period-status')!;
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
  const actionFooter = root.querySelector<HTMLElement>('.chain-document__footer')!;

  let currentTab = tab;
  const noteTagEditors = new Map<string, InlineTagEditorView>();
  let autoEditAttempted = false;
  let autoEditFrame: number | null = null;
  let lastPreviewClick: { noteId: string; at: number } | null = null;
  let actionSpaceObserver: ResizeObserver | null = null;
  let activePeriodKey: string | null = null;
  const flashTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let periodHighlightTimer: ReturnType<typeof setTimeout> | null = null;
  let periodHighlightFadeTimer: ReturnType<typeof setTimeout> | null = null;
  let periodFocusFrame: number | null = null;

  const findPeriodMonth = (
    periods: NotePeriodYear[],
    key: string | null
  ): NotePeriodMonth | null => {
    if (key === null) return null;
    for (const year of periods) {
      const month = year.months.find((item) => item.key === key);
      if (month) return month;
    }
    return null;
  };

  const clearPeriodHighlightTimers = (): void => {
    if (periodHighlightTimer !== null) {
      clearTimeout(periodHighlightTimer);
      periodHighlightTimer = null;
    }
    if (periodHighlightFadeTimer !== null) {
      clearTimeout(periodHighlightFadeTimer);
      periodHighlightFadeTimer = null;
    }
  };

  const clearPeriodHighlightClasses = (): void => {
    history
      .querySelectorAll<HTMLElement>(
        '.chain-note--period-selected, .chain-note--period-selected-expiring'
      )
      .forEach((note) => {
        note.classList.remove(
          'chain-note--period-selected',
          'chain-note--period-selected-expiring'
        );
      });
  };

  const syncPeriodSelection = (noteIds: string[]): void => {
    const selected = new Set(noteIds);
    history.querySelectorAll<HTMLElement>('.chain-note').forEach((note) => {
      note.classList.remove('chain-note--period-selected-expiring');
      note.classList.toggle(
        'chain-note--period-selected',
        selected.has(note.dataset['noteId'] ?? '')
      );
    });
  };

  const clearFlash = (className: string): void => {
    const timer = flashTimers.get(className);
    if (timer !== undefined) {
      clearTimeout(timer);
      flashTimers.delete(className);
    }
    history
      .querySelectorAll<HTMLElement>(`.${className}`)
      .forEach((note) => note.classList.remove(className));
  };

  const flashNotes = (noteIds: string[], className: string): void => {
    clearFlash(className);
    const ids = new Set(noteIds);
    const targets = [
      ...history.querySelectorAll<HTMLElement>('.chain-note'),
    ].filter((note) => ids.has(note.dataset['noteId'] ?? ''));
    if (targets.length === 0) return;

    targets.forEach((note) => {
      void note.offsetWidth;
      note.classList.add(className);
    });

    const timer = setTimeout(() => {
      flashTimers.delete(className);
      targets.forEach((note) => note.classList.remove(className));
    }, PERIOD_FLASH_MS);
    flashTimers.set(className, timer);
  };

  const clearPeriodFlash = (): void =>
    clearFlash('chain-note--period-flash');

  const flashPeriodNotes = (noteIds: string[]): void =>
    flashNotes(noteIds, 'chain-note--period-flash');

  const focusFirstNoteOfPeriod = (noteIds: string[]): void => {
    const selected = new Set(noteIds);
    const target =
      [...history.querySelectorAll<HTMLElement>('.chain-note')].find((note) =>
        selected.has(note.dataset['noteId'] ?? '')
      ) ?? null;
    if (!target) return;

    target.focus({ preventScroll: true });

    const group = target.closest('.chain-date-group');
    const heading = group?.querySelector<HTMLElement>(
      '.chain-date-group__heading'
    );
    const listRect = scroll.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top =
      scroll.scrollTop +
      targetRect.top -
      listRect.top -
      (heading?.offsetHeight ?? 0) -
      8;
    const maxTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    scroll.scrollTop = Math.min(Math.max(0, top), maxTop);
  };

  const schedulePeriodFocus = (noteIds: string[]): void => {
    if (periodFocusFrame !== null) cancelAnimationFrame(periodFocusFrame);
    periodFocusFrame = requestAnimationFrame(() => {
      periodFocusFrame = null;
      focusFirstNoteOfPeriod(noteIds);
    });
  };

  const periodMenu = mountPeriodMenu({
    onSelect: (month) => {
      activePeriodKey = month.key;
      periodMenu.update(
        buildNotePeriods(currentTab.notes, 'asc'),
        activePeriodKey
      );
      syncPeriodSelection(month.noteIds);
      flashPeriodNotes(month.noteIds);
      schedulePeriodFocus(month.noteIds);
      periodStatus.textContent = `${month.monthLabel} de ${
        month.year
      } selecionado. ${month.count} ${
        month.count === 1 ? 'nota' : 'notas'
      } em destaque.`;
      startPeriodHighlightTimer();
    },
  });

  function finishPeriodHighlight(): void {
    clearPeriodHighlightTimers();
    activePeriodKey = null;
    clearPeriodHighlightClasses();
    periodMenu.setActive(null);
    periodStatus.textContent = '';
  }

  function expirePeriodHighlight(): void {
    if (activePeriodKey === null) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      finishPeriodHighlight();
      return;
    }

    history
      .querySelectorAll<HTMLElement>('.chain-note--period-selected')
      .forEach((note) =>
        note.classList.add('chain-note--period-selected-expiring')
      );
    periodHighlightFadeTimer = setTimeout(
      finishPeriodHighlight,
      PERIOD_HIGHLIGHT_FADE_MS
    );
  }

  function startPeriodHighlightTimer(): void {
    clearPeriodHighlightTimers();
    periodHighlightTimer = setTimeout(() => {
      periodHighlightTimer = null;
      expirePeriodHighlight();
    }, PERIOD_HIGHLIGHT_MS);
  }

  const cancelAutoEdit = (): void => {
    if (autoEditFrame !== null) cancelAnimationFrame(autoEditFrame);
    autoEditFrame = null;
  };

  const syncActionOverlaySpace = (): void => {
    if (!currentTab.composerCollapsed) return;

    const footerRect = actionFooter.getBoundingClientRect();
    if (footerRect.height <= 0) return;

    const rootRect = root.getBoundingClientRect();
    const space = Math.max(0, Math.ceil(rootRect.bottom - footerRect.top));
    if (space <= 0) return;

    root.style.setProperty('--chain-actions-overlay-space', `${space}px`);
  };

  const onActionSpaceResize = (): void => syncActionOverlaySpace();
  window.addEventListener('resize', onActionSpaceResize);

  if (typeof ResizeObserver !== 'undefined') {
    actionSpaceObserver = new ResizeObserver(() => syncActionOverlaySpace());
    actionSpaceObserver.observe(actionFooter);
    actionSpaceObserver.observe(root);
  }

  const requestEdit = (
    noteId: string,
    options?: { focus?: boolean; preview?: boolean }
  ): void => {
    cancelAutoEdit();
    if (options?.preview === true) {
      const now = Date.now();
      const isDoubleClick =
        lastPreviewClick?.noteId === noteId &&
        now - lastPreviewClick.at <= PREVIEW_DOUBLE_CLICK_MS;
      lastPreviewClick = { noteId, at: now };
      if (isDoubleClick) {
        handlers.onEditNote?.(noteId, { ...options, preview: false });
        return;
      }
    }
    if (options) handlers.onEditNote?.(noteId, options);
    else handlers.onEditNote?.(noteId);
  };
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
  let actionsCompact = false;

  const syncActionFooter = (): void => {
    root.classList.toggle(
      'chain-document--actions-compact',
      actionsCompact || !currentTab.composerCollapsed
    );
  };

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
    syncActionFooter();
    syncActionOverlaySpace();
  };

  const renderTags = (): void => {
    const summary = appState.get().chainSummaries.find(
      (chain) => chain.id === currentTab.chainId
    );

    tagEditor.update(summary?.tags ?? [], appState.get().allTags);
  };

  const destroyNoteTagEditors = (): void => {
    noteTagEditors.forEach((editor) => editor.destroy());
    noteTagEditors.clear();
  };

  const syncNoteTagEditors = (): void => {
    noteTagEditors.forEach((editor, noteId) => {
      const note = currentTab.notes.find((item) => item.id === noteId);
      if (!note) {
        editor.destroy();
        noteTagEditors.delete(noteId);
        return;
      }
      editor.update(note.tags ?? [], appState.get().allTags);
    });
  };

  const mountNoteTagEditors = (): void => {
    destroyNoteTagEditors();
    history
      .querySelectorAll<HTMLElement>('[data-note-tags-host="true"]')
      .forEach((host) => {
        const noteId = host.dataset['noteId'];
        if (!noteId) return;
        const note = currentTab.notes.find((item) => item.id === noteId);
        if (!note) return;

        const editor = mountInlineTagEditor(
          host,
          {
            onAdd: (tagName) =>
              handlers.onAddNoteTag?.(noteId, tagName) ?? Promise.resolve(false),
            onRemove: (tag) => handlers.onRemoveNoteTag?.(noteId, tag),
          },
          {
            addButtonClassName: 'chain-note__tag-add',
            addButtonAriaLabel: 'Adicionar tag \u00e0 nota',
            addButtonTitle: 'Adicionar tag',
            addButtonHaspopup: 'dialog',
            addButtonText: '',
            removeAriaLabel: (tag) => `Remover tag ${tag.name} desta nota`,
          }
        );
        editor.update(note.tags ?? [], appState.get().allTags);
        noteTagEditors.set(noteId, editor);
      });
  };

  const renderNotes = (): void => {
    const editingNoteIds = new Set(
      currentTab.noteTabs
        .map((noteTab) => noteTab.editingNoteId)
        .filter((id): id is string => Boolean(id))
    );
    const activeEditNoteId =
      currentTab.noteTabs.find((noteTab) => noteTab.id === currentTab.activeNoteTabId)
        ?.editingNoteId ?? null;
    const noteGroups = groupNotesByDate(currentTab.notes);
    const notesSignature = currentTab.notes
      .map(
        (note) =>
          `${note.id}:${note.updatedAt}:${(note.attachments ?? [])
            .map((attachment) => attachment.id)
            .join(',')}`
      )
      .join('|');
    const signature = `${notesSignature}#${[...editingNoteIds].sort().join(',')}#${
      activeEditNoteId ?? ''
    }`;

    const periods = buildNotePeriods(currentTab.notes, 'asc');
    const activeMonth = findPeriodMonth(periods, activePeriodKey);
    periodMenu.update(periods, activePeriodKey);

    const hasPendingDraft = currentTab.noteTabs.some(
      (noteTab) => !noteTab.editingNoteId && noteTab.content.trim().length > 0
    );
    if (hasPendingDraft || (currentTab.status === 'loaded' && currentTab.notes.length === 0)) {
      autoEditAttempted = true;
    }
    if (
      editingNoteIds.size === 0 &&
      !hasPendingDraft &&
      !autoEditAttempted &&
      currentTab.status === 'loaded' &&
      currentTab.notes.length > 0
    ) {
      autoEditAttempted = true;
      const lastGroup = noteGroups[noteGroups.length - 1];
      const latestNote = lastGroup?.notes[lastGroup.notes.length - 1];
      if (latestNote) {
        autoEditFrame = requestAnimationFrame(() => {
          autoEditFrame = null;
          if (currentTab.noteTabs.some((noteTab) => noteTab.editingNoteId)) return;
          if (currentTab.status !== 'loaded') return;
          handlers.onEditNote?.(latestNote.id, { focus: false, preview: true });
        });
      }
    }

    count.textContent = `${currentTab.notes.length} ${
      currentTab.notes.length === 1 ? 'nota' : 'notas'
    }`;

    if (
      (currentTab.status === 'loading' || currentTab.status === 'idle') &&
      currentTab.notes.length === 0
    ) {
      destroyNoteTagEditors();
      history.innerHTML = '';
      history.appendChild(renderLoadingState());
      renderedNotesSignature = signature;
      return;
    }

    if (currentTab.status === 'error') {
      destroyNoteTagEditors();
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
      syncNoteTagEditors();
      return;
    }

    destroyNoteTagEditors();
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
      noteGroups.forEach((group) => {
        const section = el('section', 'chain-date-group');
        section.setAttribute('aria-label', group.fullLabel);

        const heading = el('h3', 'chain-date-group__heading');
        const headingButton = el('button', 'chain-date-group__label');
        headingButton.type = 'button';
        headingButton.setAttribute('aria-haspopup', 'menu');
        headingButton.setAttribute('aria-expanded', 'false');
        headingButton.setAttribute('aria-label', `${group.label} — ir para período`);
        headingButton.title = `${group.fullLabel} — ir para período`;
        headingButton.textContent = group.label;
        heading.appendChild(headingButton);
        section.appendChild(heading);

        group.notes.forEach((note) => {
          section.appendChild(
            renderNote(
              note,
              editingNoteIds.has(note.id),
              note.id === activeEditNoteId,
              {
                onEdit: requestEdit,
                ...(handlers.onAddNoteImages
                  ? { onAddImages: handlers.onAddNoteImages }
                  : {}),
                ...(handlers.onAddNoteAudio
                  ? { onAddAudio: handlers.onAddNoteAudio }
                  : {}),
                ...(handlers.onDeleteNote
                  ? { onDelete: handlers.onDeleteNote }
                  : {}),
                ...(handlers.onDeleteNoteAttachment
                  ? { onDeleteAttachment: handlers.onDeleteNoteAttachment }
                  : {}),
                showTags: Boolean(
                  handlers.onAddNoteTag || handlers.onRemoveNoteTag
                ),
              }
            )
          );
        });

        history.appendChild(section);
      });
    }

    mountNoteTagEditors();
    syncPeriodSelection(activeMonth?.noteIds ?? []);
    renderedNotesSignature = signature;
    scroll.scrollTop = previousScroll;
  };

  const activeNoteTab = (): ChainNoteTab | null =>
    currentTab.noteTabs.find((item) => item.id === currentTab.activeNoteTabId) ??
    null;

  const syncQuickActions = (): void => {
    const hasNotes = currentTab.notes.length > 0;
    quickImage.disabled = !hasNotes;
    quickAudio.disabled = !hasNotes;

    if (hasNotes) {
      quickImage.title = 'Adicionar imagem ao final da cadeia';
      quickImage.setAttribute('aria-label', 'Adicionar imagem ao final da cadeia');
      quickAudio.title = 'Gravar áudio para o final da cadeia';
      quickAudio.setAttribute('aria-label', 'Gravar áudio para o final da cadeia');
    } else {
      quickImage.title = 'Em breve';
      quickImage.setAttribute('aria-label', 'Imagem, em breve');
      quickAudio.title = 'Em breve';
      quickAudio.setAttribute('aria-label', 'Áudio, em breve');
    }
  };

  quickImage.addEventListener('click', () => {
    void pickImagesWithClipboardFallback((files) => {
      handlers.onAddChainImages?.(files);
    });
  });

  quickAudio.addEventListener('click', () => {
    handlers.onAddChainAudio?.();
  });

  quickLink.addEventListener('click', () => {
    handlers.onPasteText?.();
  });

  const onHistoryClick = (event: MouseEvent): void => {
    const target = event.target as Element | null;
    if (!target) return;
    const periodTrigger =
      target.closest<HTMLButtonElement>('.chain-date-group__label');
    if (periodTrigger) {
      periodMenu.open(periodTrigger);
      return;
    }
    if (target.closest('.chain-note__body')) return;
    if (target.closest('button, a, input, textarea, select, [contenteditable="true"]')) {
      return;
    }
    if (currentTab.composerCollapsed) return;

    const active = activeNoteTab();
    if (!active) return;
    handlers.onCloseNote(active.id);
  };
  scroll.addEventListener('click', onHistoryClick);

  const onHistoryKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const target = event.target as Element | null;
    const periodTrigger =
      target?.closest<HTMLButtonElement>('.chain-date-group__label') ?? null;
    if (!periodTrigger) return;
    event.preventDefault();
    periodMenu.open(periodTrigger, event.key === 'ArrowUp');
  };
  history.addEventListener('keydown', onHistoryKeyDown);

  const isEscapeHandledByChild = (event: KeyboardEvent): boolean =>
    event.composedPath().some(
      (node) =>
        node instanceof Element &&
        node.matches(
          '.tag-add__input, .content-type-menu, .period-menu, .chain-date-group__label, .editor-tab__rename-input'
        )
    );

  const onEditorKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (document.querySelector('.dialog-backdrop, .content-type-menu, .period-menu')) {
      return;
    }
    if (isEscapeHandledByChild(event)) return;
    if (currentTab.composerCollapsed) return;

    const active = activeNoteTab();
    if (!active) return;

    event.preventDefault();
    event.stopPropagation();
    handlers.onCloseNote(active.id);
  };
  root.addEventListener('keydown', onEditorKeyDown);

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

  const syncSaveAction = (editing: boolean): void => {
    saveLabel.textContent = savingState
      ? editing
        ? 'Salvando...'
        : 'Adicionando...'
      : editing
        ? 'Salvar'
        : 'Adicionar';
    const icon = save.querySelector<HTMLElement>('.material-symbols-rounded');
    if (icon) icon.textContent = savingState ? 'hourglass_top' : editing ? 'save' : 'add';
  };

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
      composerShell.classList.remove('chain-composer--editing');
      syncSaveAction(false);
      activeLine.refresh();
      return;
    }

    const type = contentTypeOf(noteTab);
    const metaInfo = NOTE_CONTENT_TYPE_META[type];
    const isCode = type === 'code';
    const verbatim = isVerbatimContentType(type);
    const editing = Boolean(noteTab.editingNoteId);
    composer.hidden = false;
    emptyNote.hidden = true;
    contentTypeMenu.element.hidden = false;
    contentTypeMenu.update(type);
    composer.classList.toggle('chain-composer__input--code', isCode);
    composer.classList.toggle('chain-composer__input--verbatim', verbatim);
    composer.spellcheck = metaInfo.spellcheck;
    composer.placeholder = isCode
      ? editing
        ? 'Edite o trecho de código...'
        : 'Escreva um trecho de código...'
      : type === 'markdown'
        ? editing
          ? 'Edite a nota em Markdown...'
          : 'Escreva uma nota em Markdown...'
        : editing
          ? 'Edite a nota...'
          : 'Escreva uma nova nota para esta cadeia...';
    panel.setAttribute('aria-labelledby', `editor-tab-${noteTab.id}`);
    save.disabled = savingState;
    composer.disabled = savingState;
    composerShell.classList.toggle('chain-composer--editing', editing);

    if (renderedNoteTabId !== noteTab.id) {
      composer.value = noteTab.content;
      renderedNoteTabId = noteTab.id;
    } else if (composer !== document.activeElement && composer.value !== noteTab.content) {
      composer.value = noteTab.content;
    }

    const dirty = isChainNoteTabDirty(noteTab);
    composerStatus.textContent = editing
      ? dirty
        ? 'Alterações não salvas'
        : 'Editando nota'
      : dirty
        ? 'Pronto para adicionar'
        : '';
    syncSaveAction(editing);
    activeLine.refresh();
  };

  const renderNoteTabs = (): void => {
    const items = currentTab.noteTabs.map((noteTab) => {
      const editing = Boolean(noteTab.editingNoteId);
      const type = contentTypeOf(noteTab);
      return {
        id: noteTab.id,
        label: noteTabLabel(noteTab),
        icon: editing
          ? 'edit'
          : type === 'text'
            ? 'edit_note'
            : NOTE_CONTENT_TYPE_META[type].icon,
        dirty: isChainNoteTabDirty(noteTab),
        editing,
        preview: noteTab.preview === true,
      };
    });

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

  newNote.addEventListener('click', handlers.onCreateNote);
  emptyNewNote.addEventListener('click', handlers.onCreateNote);
  save.addEventListener('click', () => {
    const active = activeNoteTab();
    if (active) handlers.onSaveNote(active.id);
  });

  let lastScrollTop = scroll.scrollTop;
  let upwardDistance = 0;
  let expandTimer: ReturnType<typeof setTimeout> | null = null;
  let compactFrame: number | null = null;
  let ignoreCompactUntil = 0;
  let searchTargetNoteId: string | null = null;

  const cancelExpand = (): void => {
    if (expandTimer !== null) clearTimeout(expandTimer);
    expandTimer = null;
  };

  const setActionsCompact = (value: boolean): void => {
    actionsCompact = value;
    syncActionFooter();
    syncActionOverlaySpace();
    const headerFocused = header.contains(document.activeElement);
    root.classList.toggle('chain-document--header-hidden', value && !headerFocused);
  };

  const scrollToBottom = (): void => {
    ignoreCompactUntil = Date.now() + SCROLL_IGNORE_MS;
    scroll.scrollTop = scroll.scrollHeight;
    lastScrollTop = scroll.scrollTop;
  };

  const scrollToSearchTarget = (noteId: string): void => {
    const target = history.querySelector<HTMLElement>(
      `.chain-note[data-note-id="${noteId}"]`
    );
    if (!target) return;

    const scrollRect = scroll.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    ignoreCompactUntil = Date.now() + SCROLL_IGNORE_MS;
    scroll.scrollTop +=
      targetRect.top -
      scrollRect.top -
      scroll.clientHeight / 2 +
      targetRect.height / 2;
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
    if (tabValue.chainId !== currentTab.chainId) {
      clearPeriodHighlightTimers();
      clearPeriodHighlightClasses();
      activePeriodKey = null;
      periodStatus.textContent = '';
    }
    currentTab = tabValue;
    root.setAttribute('aria-label', `Cadeia ${tabValue.title}`);
    root.dataset['chainId'] = tabValue.chainId;

    syncComposerState(tabValue);
    renderTags();
    renderNotes();
    syncQuickActions();
    renderNoteTabs();
    syncNoteEditor();

    if (justLoaded) {
      requestAnimationFrame(() => {
        if (searchTargetNoteId) scrollToSearchTarget(searchTargetNoteId);
        else scrollToBottom();
      });
    }

    previousStatus = tabValue.status;
  };

  const setSaving = (saving: boolean): void => {
    savingState = saving;
    newNote.disabled = saving;
    emptyNewNote.disabled = saving;
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
    cancelAutoEdit();
    scroll.removeEventListener('scroll', onScroll);
    scroll.removeEventListener('click', onHistoryClick);
    history.removeEventListener('keydown', onHistoryKeyDown);
    root.removeEventListener('keydown', onEditorKeyDown);
    window.removeEventListener('resize', onActionSpaceResize);
    actionSpaceObserver?.disconnect();
    actionSpaceObserver = null;
    stopAllAudioCascades();
    stopAttachmentAudio();
    releaseAllAttachmentUrls();
    cancelExpand();
    if (compactFrame !== null) cancelAnimationFrame(compactFrame);
    compactFrame = null;
    if (periodFocusFrame !== null) cancelAnimationFrame(periodFocusFrame);
    periodFocusFrame = null;
    clearPeriodHighlightTimers();
    clearPeriodHighlightClasses();
    clearPeriodFlash();
    clearFlash('chain-note--search-flash');
    window.removeEventListener('dragend', resetFileDrag);
    window.removeEventListener('drop', resetFileDrag, true);
    window.removeEventListener('dragleave', resetWhenLeavingWindow);
    contentTypeMenu.destroy();
    periodMenu.destroy();
    activeLine.destroy();
    tagEditor.destroy();
    destroyNoteTagEditors();
  };

  update(tab);

  requestAnimationFrame(() => {
    if (searchTargetNoteId) scrollToSearchTarget(searchTargetNoteId);
    else if (tab.status === 'loaded') scrollToBottom();
    syncActionOverlaySpace();
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
    focusSearchMatch: (query) => {
      const noteTab = activeNoteTab();
      if (currentTab.composerCollapsed || !noteTab) {
        documentAction.focus();
        return;
      }
      if (composer.value !== noteTab.content) {
        composer.value = noteTab.content;
      }

      const editingNoteId = noteTab.editingNoteId;
      if (editingNoteId) {
        searchTargetNoteId = editingNoteId;
        history
          .querySelectorAll('.chain-note--search-target')
          .forEach((note) => note.classList.remove('chain-note--search-target'));

        const target = history.querySelector<HTMLElement>(
          `.chain-note[data-note-id="${editingNoteId}"]`
        );
        if (target) {
          target.classList.add('chain-note--search-target');
          const body = target.querySelector<HTMLElement>('.chain-note__body');
          if (body) highlightTextInElement(body, query);
          flashNotes([editingNoteId], 'chain-note--search-flash');
        }
        scrollToSearchTarget(editingNoteId);
        requestAnimationFrame(() => {
          if (searchTargetNoteId === editingNoteId) {
            scrollToSearchTarget(editingNoteId);
          }
        });
      }

      composer.focus({ preventScroll: true });
      const range = findMatchRange(composer.value, query);
      if (range) {
        composer.setSelectionRange(range.start, range.end);
        const lineHeight =
          parseFloat(getComputedStyle(composer).lineHeight) || 24;
        const line = composer.value.slice(0, range.start).split('\n').length;
        composer.scrollTop = Math.max(0, (line - 3) * lineHeight);
      }
      activeLine.refresh();
    },
    destroy,
  };
}
