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
import { showChainMenu, showNoteMenu } from '../views/menus.js';
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
import { renderNotePreview } from './NotePreview.js';
import { getTimelineChainColors } from '../app/timelineColors.js';
import { stopAttachmentAudio, renderNoteAttachments } from './NoteAttachments.js';
import { stopAllAudioCascades } from './audioList.js';
import { releaseAllAttachmentUrls } from './attachmentUrls.js';
import {
  CHAIN_AUDIO_KEY,
  createInlineAudioRecorder,
  noteAudioKey,
  paintInlineAudioButton,
} from './inlineAudioRecorder.js';
import { snackbar } from './Snackbar.js';
import type { AudioRecorderController, RecordedAudio } from './audioRecorder.js';
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
const COMPACT_DELAY_MS = 120;
const EXPAND_DELAY_MS = 120;
const SCROLL_IGNORE_MS = 100;
const SCROLL_BOTTOM_TOLERANCE = 16;
const PERIOD_FLASH_MS = 1200;
const PERIOD_HIGHLIGHT_MS = 5000;
const PERIOD_HIGHLIGHT_FADE_MS = 300;
const HISTORY_INITIAL_PAGE = 80;
const HISTORY_PAGE_SIZE = 80;
const HISTORY_MAX_WINDOW = 240;
const HISTORY_SCROLL_SUPPRESS_MS = 400;

export interface ChainDocumentHandlers {
  initialEditorMode?: 'latest' | 'blank' | 'none';
  onNoteInput: (noteTabId: string, value: string) => void;
  onContentTypeChange?: (noteTabId: string, contentType: NoteContentType) => void;
  onSaveNote: (noteTabId: string, options?: { closeEditor?: boolean }) => void;
  onEditNote?: (
    noteId: string,
    options?: { focus?: boolean; preview?: boolean }
  ) => void;
  onAddNoteImages?: (noteId: string, files: File[]) => void;
  onSaveNoteAudio?: (
    noteId: string,
    recorded: RecordedAudio
  ) => Promise<boolean>;
  onAddChainImages?: (files: File[]) => void;
  onSaveChainAudio?: (recorded: RecordedAudio) => Promise<boolean>;
  startAudioRecordingFn?: () => Promise<AudioRecorderController>;
  onPasteText?: () => void;
  onDeleteNoteAttachment?: (noteId: string, attachment: AttachmentDTO) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveNote?: (noteId: string) => Promise<boolean>;
  onDeleteSelected?: (noteIds: string[]) => Promise<boolean>;
  onMoveSelected?: (noteIds: string[]) => Promise<boolean>;
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
  onPreview?: (noteId: string) => void;
  onEdit?: (noteId: string, options?: { focus?: boolean; preview?: boolean }) => void;
  onAddImages?: (noteId: string, files: File[]) => void;
  onToggleAudio?: (noteId: string) => void;
  onMove?: (noteId: string) => void;
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

  const selectLabel = el('label', 'chain-note__select');
  const selectInput = document.createElement('input');
  selectInput.type = 'checkbox';
  selectInput.className = 'chain-note__select-input';
  selectInput.dataset['noteSelect'] = note.id;
  selectInput.setAttribute(
    'aria-label',
    `Selecionar nota de ${formatDateFull(note.createdAt)}`
  );
  selectLabel.appendChild(selectInput);
  meta.appendChild(selectLabel);

  if (note.role === 'header') {
    const role = el('span', 'chain-note__role chain-note__role--header');
    role.textContent = 'Início';
    meta.appendChild(role);
  }

  if (note.sourceFileName) {
    const file = el('span', 'chain-note__file');
    file.title = note.sourceFileName;
    const fileIcon = el('span', 'material-symbols-rounded chain-note__file-icon');
    fileIcon.setAttribute('aria-hidden', 'true');
    fileIcon.textContent = 'description';
    const fileName = el('span', 'chain-note__file-name');
    fileName.textContent = note.sourceFileName;
    file.append(fileIcon, fileName);
    meta.appendChild(file);
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

  const preview = el('button', 'btn-icon chain-note__preview');
  preview.type = 'button';
  preview.setAttribute('aria-label', 'Visualizar nota');
  preview.title = 'Visualizar nota';
  preview.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">visibility</span>';
  preview.addEventListener('click', () => handlers.onPreview?.(note.id));

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
  addAudio.setAttribute('aria-label', 'Gravar áudio nesta nota');
  addAudio.title = 'Gravar áudio nesta nota';
  addAudio.dataset['audioKey'] = noteAudioKey(note.id);
  addAudio.dataset['audioKind'] = 'note';
  addAudio.innerHTML = `
    <span class="material-symbols-rounded chain-note__audio-icon" aria-hidden="true">mic</span>
    <span class="chain-note__audio-timer" aria-hidden="true" hidden></span>
  `;
  addAudio.addEventListener('click', () => handlers.onToggleAudio?.(note.id));

  const moreOptions = el('button', 'btn-icon chain-note__more');
  moreOptions.type = 'button';
  moreOptions.setAttribute('aria-label', 'Opções da nota');
  moreOptions.title = 'Opções da nota';
  moreOptions.setAttribute('aria-haspopup', 'menu');
  moreOptions.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">more_vert</span>';
  moreOptions.addEventListener('click', (event) => {
    showNoteMenu(event, {
      onMove: () => handlers.onMove?.(note.id),
      onDelete: () => handlers.onDelete?.(note.id),
    });
  });

  actions.append(preview, edit, addImage, addAudio, moreOptions);
  meta.appendChild(actions);

  const noteTags = note.tags ?? [];
  let tagsRow: HTMLElement | null = null;
  if (noteTags.length > 0 || handlers.showTags) {
    tagsRow = el('div', 'chain-note__tags');
    tagsRow.setAttribute('role', 'group');
    tagsRow.setAttribute('aria-label', 'Tags da nota');
    tagsRow.dataset['noteTagsHost'] = 'true';
    tagsRow.dataset['noteId'] = note.id;
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
  body.title = 'Clique para visualizar; use Editar para abrir o editor.';
  body.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (target?.closest('a, button')) return;
    handlers.onPreview?.(note.id);
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
  article.append(meta);
  if (tagsRow) article.append(tagsRow);
  article.append(body);
  return article;
}

export function mountChainDocument(
  tab: ChainTab,
  handlers: ChainDocumentHandlers
): ChainDocumentView {
  const root = el('section', 'chain-document');
  root.id = 'editor-panel';
  root.setAttribute('role', 'tabpanel');
  root.setAttribute('aria-label', `Coleção ${tab.title}`);
  root.setAttribute('aria-labelledby', `editor-tab-${tab.id}`);

  root.innerHTML = `
    <header class="chain-document__header">
      <div class="chain-document__meta">
        <div class="chain-document__tags" id="chain-tags" aria-label="Tags da coleção"></div>
        <span class="chain-document__count" id="chain-note-count"></span>
        <div class="chain-selection-summary" id="chain-selection-summary" hidden>
          <label class="chain-selection-all">
            <input type="checkbox" id="chain-select-all" class="chain-selection-all__input" />
            <span>Todas</span>
          </label>
          <span class="chain-selection-count" id="chain-selection-count" aria-live="polite"></span>
        </div>
        <div class="chain-document__actions">
          <button class="btn-icon" id="chain-note-select-toggle" type="button"
            aria-label="Selecionar notas" title="Selecionar notas" aria-pressed="false">
            <span class="material-symbols-rounded" aria-hidden="true">checklist</span>
          </button>
          <button class="btn-icon" id="chain-import-file" type="button"
            aria-label="Importar documento para esta coleção" title="Importar documento">
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
            placeholder="Escreva uma nova nota para esta coleção..."
            aria-label="Conteúdo da nota"></textarea>
          <div class="chain-note-empty" id="chain-note-empty" hidden>
            <span class="material-symbols-rounded chain-note-empty__icon" aria-hidden="true">edit_note</span>
            <p class="chain-note-empty__title">Nenhuma nota em edição</p>
            <p class="chain-note-empty__body">Crie um novo documento para adicionar à coleção.</p>
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

      <aside class="timeline-preview chain-note-preview" id="chain-note-preview" aria-label="Prévia da nota" hidden></aside>
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
      <span class="chain-document__drop-text">Solte para importar nesta coleção</span>
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
  const selectToggle = root.querySelector<HTMLButtonElement>(
    '#chain-note-select-toggle'
  )!;
  const selectionSummary = root.querySelector<HTMLElement>(
    '#chain-selection-summary'
  )!;
  const selectAll = root.querySelector<HTMLInputElement>('#chain-select-all')!;
  const selectionCount = root.querySelector<HTMLElement>(
    '#chain-selection-count'
  )!;
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
  const previewHost = root.querySelector<HTMLElement>('#chain-note-preview')!;
  const actionFooter = root.querySelector<HTMLElement>('.chain-document__footer')!;

  let currentTab = tab;
  let previewNoteId: string | null = null;
  let selectionMode = false;
  const selectedNoteIds = new Set<string>();
  const audioRecorder = createInlineAudioRecorder({
    ...(handlers.startAudioRecordingFn
      ? { startRecordingFn: handlers.startAudioRecordingFn }
      : {}),
    onChange: () => syncAudioButtons(),
    onError: (message) => snackbar.error(message),
  });
  const noteTagEditors = new Map<string, InlineTagEditorView>();
  let noteTagEditorObserver: IntersectionObserver | null = null;
  let autoEditAttempted = false;
  let autoEditFrame: number | null = null;
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
    let target =
      [...history.querySelectorAll<HTMLElement>('.chain-note')].find((note) =>
        selected.has(note.dataset['noteId'] ?? '')
      ) ?? null;
    if (!target && noteIds[0]) {
      ensureHistoryWindowForNote(noteIds[0]);
      target =
        [...history.querySelectorAll<HTMLElement>('.chain-note')].find((note) =>
          selected.has(note.dataset['noteId'] ?? '')
        ) ?? null;
    }
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

    const value = `${space}px`;
    if (
      root.style.getPropertyValue('--chain-actions-overlay-space') === value
    ) {
      return;
    }
    root.style.setProperty('--chain-actions-overlay-space', value);
  };

  const onActionSpaceResize = (): void => syncActionOverlaySpace();
  window.addEventListener('resize', onActionSpaceResize);

  function syncPreview(): void {
    const previousScrollTop = scroll.scrollTop;
    const note =
      previewNoteId === null
        ? undefined
        : currentTab.notes.find((item) => item.id === previewNoteId);
    if (!note) previewNoteId = null;

    const open = Boolean(note);
    root.classList.toggle('chain-document--preview-open', open);
    previewHost.hidden = !open;
    history.querySelectorAll<HTMLElement>('.chain-note').forEach((article) => {
      article.classList.toggle(
        'chain-note--previewing',
        article.dataset['noteId'] === previewNoteId
      );
    });

    if (!note) {
      previewHost.replaceChildren();
      scroll.scrollTop = previousScrollTop;
      return;
    }

    const accent =
      getTimelineChainColors([currentTab.chainId]).get(currentTab.chainId) ??
      'var(--md-sys-color-outline-variant)';

    renderNotePreview(
      previewHost,
      {
        chainId: currentTab.chainId,
        chainTitle: currentTab.title,
        note,
      },
      {
        accent,
        onClose: () => closePreview(),
        action: {
          label: 'Editar nota',
          icon: 'edit',
          onClick: () => {
            closePreview();
            handlers.onEditNote?.(note.id);
          },
        },
      }
    );
    scroll.scrollTop = previousScrollTop;
  }

  function closePreview(): void {
    previewNoteId = null;
    syncPreview();
  }

  function openPreview(noteId: string): void {
    previewNoteId = noteId;
    syncPreview();
  }

  const syncNoteSelection = (): void => {
    const noteIds = new Set(currentTab.notes.map((note) => note.id));
    selectedNoteIds.forEach((noteId) => {
      if (!noteIds.has(noteId)) selectedNoteIds.delete(noteId);
    });

    history.querySelectorAll<HTMLElement>('.chain-note').forEach((article) => {
      const noteId = article.dataset['noteId'];
      const input = article.querySelector<HTMLInputElement>(
        '[data-note-select]'
      );
      const checked =
        selectionMode && noteId !== undefined && selectedNoteIds.has(noteId);
      if (input) input.checked = checked;
      article.classList.toggle('chain-note--marked', checked);
    });

    const total = currentTab.notes.length;
    const selected = selectionMode ? selectedNoteIds.size : 0;
    importButton.hidden = selected > 0;
    importButton.style.display = selected > 0 ? 'none' : '';
    selectAll.disabled = !selectionMode || total === 0;
    selectAll.checked = selectionMode && total > 0 && selected === total;
    selectAll.indeterminate =
      selectionMode && selected > 0 && selected < total;
    selectionCount.textContent = `${selected} de ${total} ${
      selected === 1 ? 'selecionada' : 'selecionadas'
    }`;
  };

  const setSelectionMode = (active: boolean): void => {
    if (selectionMode === active) return;
    selectionMode = active;

    if (active) {
      closePreview();
    } else {
      selectedNoteIds.clear();
    }

    root.classList.toggle('chain-document--selection', active);
    selectionSummary.hidden = !active;
    selectToggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    selectToggle.setAttribute('aria-label', active ? 'Cancelar seleção' : 'Selecionar notas');
    selectToggle.title = active ? 'Cancelar seleção' : 'Selecionar notas';
    const icon = selectToggle.querySelector<HTMLElement>(
      '.material-symbols-rounded'
    );
    if (icon) icon.textContent = active ? 'close' : 'checklist';

    syncNoteSelection();
    if (active) selectAll.focus({ preventScroll: true });
    else selectToggle.focus({ preventScroll: true });
  };

  selectToggle.addEventListener('click', () => {
    setSelectionMode(!selectionMode);
  });

  selectAll.addEventListener('click', () => {
    if (!selectionMode) return;
    if (selectAll.checked) {
      currentTab.notes.forEach((note) => selectedNoteIds.add(note.id));
    } else {
      selectedNoteIds.clear();
    }
    syncNoteSelection();
  });

  const onNoteSelectionClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const noteId = target.dataset['noteSelect'];
    if (!noteId || !selectionMode) return;
    if (target.checked) selectedNoteIds.add(noteId);
    else selectedNoteIds.delete(noteId);
    syncNoteSelection();
  };
  history.addEventListener('click', onNoteSelectionClick);

  previewHost.addEventListener('dblclick', (event) => {
    const target = event.target as Element | null;
    if (target?.closest('a, button, input, textarea, select')) return;
    const note =
      previewNoteId === null
        ? undefined
        : currentTab.notes.find((item) => item.id === previewNoteId);
    if (!note) return;
    closePreview();
    handlers.onEditNote?.(note.id);
  });

  const requestEdit = (
    noteId: string,
    options?: { focus?: boolean; preview?: boolean }
  ): void => {
    cancelAutoEdit();
    closePreview();
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
  let footerCompact = false;
  let historyWindowStart = Math.max(0, tab.notes.length - HISTORY_INITIAL_PAGE);
  let historyWindowEnd = tab.notes.length;
  let historySentinelObserver: IntersectionObserver | null = null;

  const syncActionFooter = (): void => {
    root.classList.toggle(
      'chain-document--actions-compact',
      footerCompact
    );
  };

  more.addEventListener('click', (event) => {
    const selectedIds = selectionMode ? [...selectedNoteIds] : [];
    const deleteSelected = handlers.onDeleteSelected;
    const moveSelected = handlers.onMoveSelected;
    const selectionOptions =
      selectedIds.length > 0
        ? {
            selectedNoteCount: selectedIds.length,
            ...(moveSelected
              ? {
                  onMoveSelected: () => {
                    void moveSelected(selectedIds).then((moved) => {
                      if (moved) setSelectionMode(false);
                    });
                  },
                }
              : {}),
            ...(deleteSelected
              ? {
                  onDeleteSelected: () => {
                    void deleteSelected(selectedIds).then((deleted) => {
                      if (deleted) setSelectionMode(false);
                    });
                  },
                }
              : {}),
          }
        : {};

    showChainMenu(event, currentTab.chainId, {
      ...(handlers.onRename ? { onRename: handlers.onRename } : {}),
      ...selectionOptions,
    });
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
  };

  const renderTags = (): void => {
    const summary = appState.get().chainSummaries.find(
      (chain) => chain.id === currentTab.chainId
    );

    tagEditor.update(summary?.tags ?? [], appState.get().allTags);
  };

  const disconnectNoteTagEditorObserver = (): void => {
    noteTagEditorObserver?.disconnect();
    noteTagEditorObserver = null;
  };

  const destroyNoteTagEditors = (): void => {
    disconnectNoteTagEditorObserver();
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

  const mountNoteTagEditorForHost = (host: HTMLElement): void => {
    const noteId = host.dataset['noteId'];
    if (!noteId || noteTagEditors.has(noteId)) return;
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
        addButtonText: 'Nova tag',
        removeAriaLabel: (tag) => `Remover tag ${tag.name} desta nota`,
      }
    );
    editor.update(note.tags ?? [], appState.get().allTags);
    noteTagEditors.set(noteId, editor);
  };

  const mountNoteTagEditors = (): void => {
    destroyNoteTagEditors();
    const hosts = [
      ...history.querySelectorAll<HTMLElement>(
        '[data-note-tags-host="true"]'
      ),
    ];

    if (typeof IntersectionObserver === 'undefined') {
      hosts.forEach(mountNoteTagEditorForHost);
      return;
    }

    noteTagEditorObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const host = entry.target as HTMLElement;
          const noteId = host.dataset['noteId'];
          if (!noteId) return;
          if (entry.isIntersecting) {
            mountNoteTagEditorForHost(host);
            return;
          }
          if (host.contains(document.activeElement)) return;
          const editor = noteTagEditors.get(noteId);
          if (!editor) return;
          editor.destroy();
          noteTagEditors.delete(noteId);
        });
      },
      { root: scroll, rootMargin: '500px 0px' }
    );
    hosts.forEach((host) => noteTagEditorObserver?.observe(host));
  };

  const syncNoteEditingState = (
    editingNoteIds: Set<string>,
    activeEditNoteId: string | null
  ): void => {
    history.querySelectorAll<HTMLElement>('.chain-note').forEach((article) => {
      const noteId = article.dataset['noteId'];
      if (!noteId) return;

      const selected = noteId === activeEditNoteId;
      article.classList.toggle('chain-note--selected', selected);
      article.setAttribute('aria-current', selected ? 'true' : 'false');

      const meta = article.querySelector<HTMLElement>('.chain-note__meta');
      if (!meta) return;
      const existing = meta.querySelector<HTMLElement>('.chain-note__editing');
      if (!editingNoteIds.has(noteId)) {
        existing?.remove();
        return;
      }
      if (existing) return;

      const badge = el('span', 'chain-note__editing');
      badge.textContent = 'Em edição';
      const actions = meta.querySelector<HTMLElement>('.chain-note__actions');
      if (actions) meta.insertBefore(badge, actions);
      else meta.appendChild(badge);
    });
  };

  const disconnectHistorySentinelObserver = (): void => {
    historySentinelObserver?.disconnect();
    historySentinelObserver = null;
  };

  const resetHistoryWindow = (): void => {
    const count = currentTab.notes.length;
    historyWindowStart = Math.max(0, count - HISTORY_INITIAL_PAGE);
    historyWindowEnd = count;
  };

  const clampHistoryWindow = (): void => {
    const count = currentTab.notes.length;
    if (count === 0) {
      historyWindowStart = 0;
      historyWindowEnd = 0;
      return;
    }
    if (historyWindowEnd <= 0 || historyWindowEnd > count) {
      historyWindowEnd = count;
    }
    historyWindowStart = Math.max(
      0,
      Math.min(historyWindowStart, count - 1)
    );
    if (historyWindowEnd <= historyWindowStart) {
      historyWindowEnd = Math.min(
        count,
        historyWindowStart + HISTORY_INITIAL_PAGE
      );
    }
    if (historyWindowEnd - historyWindowStart > HISTORY_MAX_WINDOW) {
      historyWindowStart = historyWindowEnd - HISTORY_MAX_WINDOW;
    }
  };

  const captureHistoryAnchor = (
    prefer: 'first' | 'last'
  ): { id: string; top: number } | null => {
    const cards = history.querySelectorAll<HTMLElement>('.chain-note');
    const element =
      prefer === 'last' ? cards[cards.length - 1] : cards[0];
    const id = element?.dataset['noteId'];
    if (!element || !id) return null;
    return {
      id,
      top: element.getBoundingClientRect().top - scroll.getBoundingClientRect().top,
    };
  };

  const suppressCompactDuringHistoryChange = (): void => {
    ignoreCompactUntil = Date.now() + HISTORY_SCROLL_SUPPRESS_MS;
  };

  const restoreHistoryAnchor = (
    anchor: { id: string; top: number } | null
  ): void => {
    suppressCompactDuringHistoryChange();
    if (!anchor) {
      lastScrollTop = scroll.scrollTop;
      return;
    }
    const target = history.querySelector<HTMLElement>(
      `.chain-note[data-note-id="${anchor.id}"]`
    );
    if (!target) {
      lastScrollTop = scroll.scrollTop;
      return;
    }
    const top =
      target.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    scroll.scrollTop += top - anchor.top;
    lastScrollTop = scroll.scrollTop;
  };

  function loadOlderNotes(): void {
    if (historyWindowStart <= 0) return;
    const anchor = captureHistoryAnchor('first');
    cancelCompact();
    cancelExpand();
    upwardDistance = 0;
    setActionsCompact(false);
    suppressCompactDuringHistoryChange();
    historyWindowStart = Math.max(0, historyWindowStart - HISTORY_PAGE_SIZE);
    if (historyWindowEnd - historyWindowStart > HISTORY_MAX_WINDOW) {
      historyWindowEnd = historyWindowStart + HISTORY_MAX_WINDOW;
    }
    renderNotes();
    restoreHistoryAnchor(anchor);
    requestAnimationFrame(() => restoreHistoryAnchor(anchor));
  }

  function loadNewerNotes(): void {
    if (historyWindowEnd >= currentTab.notes.length) return;
    const anchor = captureHistoryAnchor('last');
    cancelCompact();
    cancelExpand();
    upwardDistance = 0;
    suppressCompactDuringHistoryChange();
    historyWindowEnd = Math.min(
      currentTab.notes.length,
      historyWindowEnd + HISTORY_PAGE_SIZE
    );
    if (historyWindowEnd - historyWindowStart > HISTORY_MAX_WINDOW) {
      historyWindowStart = historyWindowEnd - HISTORY_MAX_WINDOW;
    }
    renderNotes();
    restoreHistoryAnchor(anchor);
    requestAnimationFrame(() => restoreHistoryAnchor(anchor));
  }

  function ensureHistoryWindowForNote(noteId: string): boolean {
    const existing = history.querySelector<HTMLElement>(
      `.chain-note[data-note-id="${noteId}"]`
    );
    if (existing) return true;

    const index = currentTab.notes.findIndex((note) => note.id === noteId);
    if (index < 0) return false;

    const count = currentTab.notes.length;
    historyWindowStart = Math.max(
      0,
      Math.min(index - Math.floor(HISTORY_MAX_WINDOW / 2), count - HISTORY_MAX_WINDOW)
    );
    historyWindowEnd = Math.min(
      count,
      historyWindowStart + HISTORY_MAX_WINDOW
    );
    suppressCompactDuringHistoryChange();
    renderNotes();
    lastScrollTop = scroll.scrollTop;
    return Boolean(
      history.querySelector<HTMLElement>(
        `.chain-note[data-note-id="${noteId}"]`
      )
    );
  }

  const renderHistorySentinel = (
    direction: 'older' | 'newer'
  ): HTMLElement => {
    const wrapper = el('div', 'chain-history-sentinel');
    wrapper.dataset['historySentinel'] = direction;
    const button = el('button', 'btn btn-text chain-history-sentinel__button');
    button.type = 'button';
    button.textContent =
      direction === 'older'
        ? 'Carregar notas anteriores'
        : 'Carregar notas posteriores';
    button.addEventListener('click', () => {
      if (direction === 'older') loadOlderNotes();
      else loadNewerNotes();
    });
    wrapper.appendChild(button);
    return wrapper;
  };

  const observeHistorySentinels = (): void => {
    disconnectHistorySentinelObserver();
    if (typeof IntersectionObserver === 'undefined') return;
    const sentinels = [
      ...history.querySelectorAll<HTMLElement>('[data-history-sentinel]'),
    ];
    if (sentinels.length === 0) return;

    historySentinelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const direction = (entry.target as HTMLElement).dataset[
            'historySentinel'
          ];
          if (direction === 'older') loadOlderNotes();
          else if (direction === 'newer') loadNewerNotes();
        });
      },
      { root: scroll, rootMargin: '600px 0px' }
    );
    sentinels.forEach((sentinel) => historySentinelObserver?.observe(sentinel));
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
    clampHistoryWindow();
    const windowNotes = currentTab.notes.slice(
      historyWindowStart,
      historyWindowEnd
    );
    const noteGroups = groupNotesByDate(windowNotes);
    const notesSignature = [
      currentTab.notes.length,
      historyWindowStart,
      historyWindowEnd,
      ...windowNotes.map(
        (note) =>
          `${note.id}:${note.updatedAt}:${(note.attachments ?? [])
            .map((attachment) => attachment.id)
            .join(',')}`
      ),
    ].join('|');
    const signature = notesSignature;

    const periods = buildNotePeriods(currentTab.notes, 'asc');
    const activeMonth = findPeriodMonth(periods, activePeriodKey);
    periodMenu.update(periods, activePeriodKey);

    const initialEditorMode = handlers.initialEditorMode ?? 'latest';
    const hasPendingDraft = currentTab.noteTabs.some(
      (noteTab) => !noteTab.editingNoteId && noteTab.content.trim().length > 0
    );
    if (hasPendingDraft) {
      autoEditAttempted = true;
    }
    if (
      editingNoteIds.size === 0 &&
      !hasPendingDraft &&
      !autoEditAttempted &&
      currentTab.status === 'loaded'
    ) {
      autoEditAttempted = true;

      if (initialEditorMode === 'blank') {
        if (currentTab.composerCollapsed) {
          autoEditFrame = requestAnimationFrame(() => {
            autoEditFrame = null;
            if (currentTab.noteTabs.some((noteTab) => noteTab.editingNoteId)) return;
            if (currentTab.status !== 'loaded') return;
            if (!currentTab.composerCollapsed) return;
            handlers.onNewDocument?.();
          });
        }
      } else if (
        initialEditorMode === 'latest' &&
        currentTab.notes.length > 0
      ) {
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
        'Não foi possível carregar a coleção',
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
      syncNoteEditingState(editingNoteIds, activeEditNoteId);
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
      if (historyWindowStart > 0) {
        history.appendChild(renderHistorySentinel('older'));
      }

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
                onPreview: openPreview,
                onEdit: requestEdit,
                ...(handlers.onAddNoteImages
                  ? { onAddImages: handlers.onAddNoteImages }
                  : {}),
                ...(handlers.onSaveNoteAudio
                  ? {
                      onToggleAudio: (noteId: string) => {
                        audioRecorder.toggle(
                          noteAudioKey(noteId),
                          (recorded) =>
                            handlers.onSaveNoteAudio!(noteId, recorded)
                        );
                      },
                    }
                  : {}),
                ...(handlers.onMoveNote
                  ? {
                      onMove: (noteId: string) => {
                        void handlers.onMoveNote?.(noteId);
                      },
                    }
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

      if (historyWindowEnd < currentTab.notes.length) {
        history.appendChild(renderHistorySentinel('newer'));
      }
    }

    observeHistorySentinels();
    mountNoteTagEditors();
    syncPeriodSelection(activeMonth?.noteIds ?? []);
    renderedNotesSignature = signature;
    scroll.scrollTop = previousScroll;
  };

  const activeNoteTab = (): ChainNoteTab | null =>
    currentTab.noteTabs.find((item) => item.id === currentTab.activeNoteTabId) ??
    null;

  const setAudioActionLock = (
    button: HTMLButtonElement,
    locked: boolean
  ): void => {
    if (locked) {
      if (button.dataset['audioLocked'] !== 'true') {
        button.dataset['audioDisabled'] = button.disabled ? 'true' : 'false';
        button.dataset['audioLocked'] = 'true';
      }
      button.disabled = true;
      return;
    }
    if (button.dataset['audioLocked'] !== 'true') return;
    button.disabled = button.dataset['audioDisabled'] === 'true';
    delete button.dataset['audioLocked'];
    delete button.dataset['audioDisabled'];
  };

  const syncAudioButtons = (): void => {
    const hasNotes = currentTab.notes.length > 0;
    root
      .querySelectorAll<HTMLButtonElement>('[data-audio-key]')
      .forEach((button) => {
        const key = button.dataset['audioKey'];
        if (!key) return;
        const kind = button.dataset['audioKind'] === 'chain' ? 'chain' : 'note';
        const state = audioRecorder.getState(key);
        const idleEnabled =
          kind === 'chain'
            ? hasNotes && Boolean(handlers.onSaveChainAudio)
            : Boolean(handlers.onSaveNoteAudio);
        if (!state && kind === 'chain' && !hasNotes) return;
        paintInlineAudioButton(button, state, kind, idleEnabled);
      });

    const activeKey = audioRecorder.getActiveKey();
    const recording = activeKey !== null;
    root
      .querySelectorAll<HTMLButtonElement>('.chain-quick-action')
      .forEach((button) => {
        setAudioActionLock(
          button,
          recording && button.dataset['audioKey'] !== activeKey
        );
      });
    root
      .querySelectorAll<HTMLButtonElement>('.chain-note__actions button')
      .forEach((button) => {
        setAudioActionLock(
          button,
          recording && button.dataset['audioKey'] !== activeKey
        );
      });
  };

  const syncQuickActions = (): void => {
    const hasNotes = currentTab.notes.length > 0;
    quickImage.disabled = !hasNotes;
    quickAudio.disabled = !hasNotes;

    if (hasNotes) {
      quickImage.title = 'Adicionar imagem ao final da coleção';
      quickImage.setAttribute('aria-label', 'Adicionar imagem ao final da coleção');
      quickAudio.title = 'Gravar áudio para o final da coleção';
      quickAudio.setAttribute('aria-label', 'Gravar áudio para o final da coleção');
    } else {
      quickImage.title = 'Em breve';
      quickImage.setAttribute('aria-label', 'Imagem, em breve');
      quickAudio.title = 'Em breve';
      quickAudio.setAttribute('aria-label', 'Audio, em breve');
    }
    syncAudioButtons();
  };

  quickImage.addEventListener('click', () => {
    void pickImagesWithClipboardFallback((files) => {
      handlers.onAddChainImages?.(files);
    });
  });

  quickAudio.dataset['audioKey'] = CHAIN_AUDIO_KEY;
  quickAudio.dataset['audioKind'] = 'chain';
  quickAudio.addEventListener('click', () => {
    if (!handlers.onSaveChainAudio) return;
    audioRecorder.toggle(CHAIN_AUDIO_KEY, handlers.onSaveChainAudio);
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
    if (target.closest('#chain-note-preview')) return;
    if (target.closest('button, a, input, textarea, select, [contenteditable="true"]')) {
      return;
    }
    if (previewNoteId !== null) {
      closePreview();
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
    if (selectionMode) {
      event.preventDefault();
      event.stopPropagation();
      setSelectionMode(false);
      return;
    }
    if (previewNoteId !== null) {
      event.preventDefault();
      event.stopPropagation();
      closePreview();
      return;
    }
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
          : 'Escreva uma nova nota para esta coleção...';
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
    if (active) handlers.onSaveNote(active.id, { closeEditor: true });
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
  let compactTimer: ReturnType<typeof setTimeout> | null = null;
  let compactFrame: number | null = null;
  let ignoreCompactUntil = 0;
  let searchTargetNoteId: string | null = null;

  const cancelExpand = (): void => {
    if (expandTimer !== null) clearTimeout(expandTimer);
    expandTimer = null;
  };

  const cancelCompact = (): void => {
    if (compactTimer !== null) clearTimeout(compactTimer);
    compactTimer = null;
  };

  const syncHeaderVisibility = (): void => {
    const headerFocused = header.contains(document.activeElement);
    const shouldHide = actionsCompact && !headerFocused;
    const hidden = root.classList.contains('chain-document--header-hidden');
    if (hidden === shouldHide) return;
    root.classList.toggle('chain-document--header-hidden', shouldHide);
  };

  const setActionsCompact = (value: boolean): void => {
    actionsCompact = value;
    footerCompact = value;
    syncActionFooter();
    syncActionOverlaySpace();
    syncHeaderVisibility();
  };

  const setActionsCompactPending = (): void => {
    actionsCompact = true;
    syncActionFooter();
    syncActionOverlaySpace();
    syncHeaderVisibility();
  };

  const scheduleCompact = (): void => {
    if (footerCompact || compactTimer !== null) return;
    compactTimer = setTimeout(() => {
      compactTimer = null;
      if (actionsCompact && scroll.scrollTop > COMPACT_SCROLL_MIN) {
        footerCompact = true;
        syncActionFooter();
        syncActionOverlaySpace();
      }
    }, COMPACT_DELAY_MS);
  };

  const scrollToBottom = (): void => {
    ignoreCompactUntil = Date.now() + SCROLL_IGNORE_MS;
    scroll.scrollTop = scroll.scrollHeight;
    lastScrollTop = scroll.scrollTop;
  };

  const scrollToSearchTarget = (noteId: string): void => {
    let target = history.querySelector<HTMLElement>(
      `.chain-note[data-note-id="${noteId}"]`
    );
    if (!target) {
      if (!ensureHistoryWindowForNote(noteId)) return;
      target = history.querySelector<HTMLElement>(
        `.chain-note[data-note-id="${noteId}"]`
      );
    }
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
      const distanceToBottom =
        scroll.scrollHeight - current - scroll.clientHeight;
      const atBottom =
        scroll.scrollHeight > scroll.clientHeight &&
        distanceToBottom <= SCROLL_BOTTOM_TOLERANCE;

      if (current <= 8) {
        cancelCompact();
        cancelExpand();
        upwardDistance = 0;
        setActionsCompact(false);
        return;
      }

      if (delta > COMPACT_DELTA_MIN && current > COMPACT_SCROLL_MIN) {
        cancelExpand();
        upwardDistance = 0;
        setActionsCompactPending();
        scheduleCompact();
        return;
      }

      if (delta < 0 && !atBottom) {
        cancelCompact();
      }

      if (delta < 0 && actionsCompact && !atBottom) {
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
    const previousChainId = currentTab.chainId;
    const previousCount = currentTab.notes.length;
    if (tabValue.chainId !== currentTab.chainId) {
      clearPeriodHighlightTimers();
      clearPeriodHighlightClasses();
      activePeriodKey = null;
      periodStatus.textContent = '';
      if (selectionMode) setSelectionMode(false);
    }
    currentTab = tabValue;
    if (tabValue.chainId !== previousChainId) {
      resetHistoryWindow();
    } else if (tabValue.notes.length !== previousCount) {
      if (previousCount === 0 && tabValue.notes.length > 0) {
        resetHistoryWindow();
      } else {
        if (historyWindowEnd === previousCount) {
          historyWindowEnd = tabValue.notes.length;
        }
        clampHistoryWindow();
      }
    }
    root.setAttribute('aria-label', `Coleção ${tabValue.title}`);
    root.dataset['chainId'] = tabValue.chainId;

    syncComposerState(tabValue);
    renderTags();
    renderNotes();
    syncQuickActions();
    renderNoteTabs();
    syncNoteEditor();
    syncPreview();
    syncNoteSelection();

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
    history.removeEventListener('click', onNoteSelectionClick);
    history.removeEventListener('keydown', onHistoryKeyDown);
    root.removeEventListener('keydown', onEditorKeyDown);
    window.removeEventListener('resize', onActionSpaceResize);
    audioRecorder.flush();
    stopAllAudioCascades();
    stopAttachmentAudio();
    releaseAllAttachmentUrls();
    cancelCompact();
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
    disconnectHistorySentinelObserver();
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
        documentAction.focus({ preventScroll: true });
        return;
      }
      const noteTab = activeNoteTab();
      if (noteTab) composer.focus({ preventScroll: true });
      else newNote.focus({ preventScroll: true });
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

        ensureHistoryWindowForNote(editingNoteId);
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
