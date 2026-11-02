import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { editorStore } from '../state/EditorStore.js';
import type {
  ChainNoteTab,
  ChainTab,
  DraftTab,
  EditorStore,
  EditorTab,
} from '../state/EditorStore.js';
import {
  contentTypeOf,
  deriveEditorTitle,
  isChainNoteTabDirty,
  isEditorTabDirty,
} from '../state/EditorStore.js';
import {
  beginTabRename,
  focusEditorTab,
  renderEditorTabs,
  updateTabDirtyState,
} from '../components/EditorTabs.js';
import { mountEditorSidebar } from '../components/EditorSidebar.js';
import { mountDraftDocument } from '../components/DraftDocument.js';
import type { DraftDocumentView } from '../components/DraftDocument.js';
import { mountChainDocument } from '../components/ChainDocument.js';
import type { ChainDocumentView } from '../components/ChainDocument.js';
import { renderQuickActions } from '../components/QuickActions.js';
import { showAppendToChainDialog } from '../components/AppendToChainDialog.js';
import { showCloseTabDialog } from '../components/CloseTabDialog.js';
import { showImportTextDialog } from '../components/ImportTextDialog.js';
import { showImportTextFilesDialog } from '../components/ImportTextFilesDialog.js';
import { showAudioRecorderDialog } from '../components/AudioRecorderDialog.js';
import { extensionForAudioMime } from '../components/audioRecorder.js';
import { readImageDimensions } from '../components/imageAttachmentInput.js';
import { releaseAttachmentUrl } from '../components/attachmentUrls.js';
import { snackbar } from '../components/Snackbar.js';
import { showConfirmDialog } from '../components/Dialog.js';
import { renderNavToggle } from '../components/NavToggle.js';
import { togglePinnedChain } from '../app/pinnedChains.js';
import { el } from '../dom.js';
import { showComposerModal } from './menus.js';
import type { AttachmentDTO } from '@application/dto/index.js';
import {
  IMAGE_ATTACHMENT_MAX_BYTES,
  IMAGE_ATTACHMENT_MIME_TYPES,
} from '@shared/types/index.js';

type ActiveDocument =
  | { id: string; kind: 'draft'; view: DraftDocumentView }
  | { id: string; kind: 'chain'; view: ChainDocumentView };

let sessionInitialized = false;

export function initEditorSession(store: EditorStore = editorStore): void {
  if (sessionInitialized) return;
  sessionInitialized = true;

  const flush = (): void => store.flush();

  window.addEventListener('beforeunload', (event) => {
    flush();
    if (!store.hasDirtyTabs()) return;
    event.preventDefault();
    event.returnValue = '';
  });
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

function activeChainId(tab: EditorTab | null): string | null {
  if (!tab) return null;
  return tab.kind === 'chain' ? tab.chainId : tab.target?.chainId ?? null;
}

function openChainAction(chainId: string): void {
  void AppController.openChainInEditor(chainId);
}

function isEscapeHandledByChild(event: KeyboardEvent): boolean {
  return event.composedPath().some(
    (node) =>
      node instanceof Element &&
      node.matches('.tag-add__input, .content-type-menu, .editor-tab__rename-input')
  );
}

export function mountEditorView(
  container: HTMLElement,
  store: EditorStore = editorStore
): () => void {
  store.ensureTab();

  const root = el('section', 'editor-view');
  root.setAttribute('aria-label', 'Editor de texto');

  const overlay = el('div', 'editor-sidebar-overlay');
  overlay.id = 'editor-sidebar-overlay';
  overlay.hidden = true;

  let importingFile = false;

  const importFilesToChain = async (chainId: string, files: File[]): Promise<void> => {
    if (importingFile || files.length === 0) return;

    importingFile = true;
    try {
      const chainTitle =
        appState.get().chainSummaries.find((chain) => chain.id === chainId)?.displayTitle ??
        'Cadeia';

      if (files.length === 1) {
        const prepared = await AppController.prepareTextImport(files[0]!);
        if (!prepared.ok) {
          snackbar.error(prepared.error);
          return;
        }

        await showImportTextDialog({
          chainTitle,
          fileName: prepared.data.fileName,
          byteSize: prepared.data.byteSize,
          ...(prepared.data.sourceModifiedAt
            ? { sourceModifiedAt: prepared.data.sourceModifiedAt }
            : {}),
          preview: prepared.data.preview,
          characterCount: prepared.data.characterCount,
          truncated: prepared.data.truncated,
          onConfirm: async (useSourceDate) => {
            const result = await AppController.importTextNote(
              chainId,
              prepared.data.content,
              useSourceDate ? prepared.data.sourceModifiedAt : undefined
            );
            return result.ok ? { ok: true } : { ok: false, error: result.error };
          },
        });
        return;
      }

      const prepared = await AppController.prepareTextImportBatch(files);
      if (!prepared.ok) {
        snackbar.error(prepared.error);
        return;
      }

      await showImportTextFilesDialog({
        chainTitle,
        valid: prepared.data.valid,
        rejected: prepared.data.rejected,
        totalBytes: prepared.data.totalBytes,
        onConfirm: async (useSourceDates) => {
          const result = await AppController.importTextNotes(
            chainId,
            prepared.data.valid,
            useSourceDates
          );
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        },
      });
    } finally {
      importingFile = false;
    }
  };

  const sidebarView = mountEditorSidebar({
    onOpenChain: (chainId) => {
      focusNoteEditorOnNextChain = true;
      setSidebarOpen(false);
      void AppController.openChainInEditor(chainId, undefined, { preview: true });
    },
    onOpenChainPinned: (chainId) => {
      focusNoteEditorOnNextChain = true;
      setSidebarOpen(false);
      void AppController.openChainInEditor(chainId, undefined, { preview: false });
    },
    onNewChain: () => {
      setSidebarOpen(false);
      showComposerModal();
    },
    onFilter: (query) => {
      appState.set({ chainFilterQuery: query });
    },
    onTogglePin: (chainId) => {
      togglePinnedChain(chainId);
      requestAnimationFrame(() => {
        const item = [...document.querySelectorAll<HTMLElement>('.editor-sidebar .chain-item')]
          .find((element) => element.dataset['chainId'] === chainId);
        item?.querySelector<HTMLButtonElement>('.chain-item__pin')?.focus();
      });
    },
    onImportFiles: (chainId, files) => {
      void importFilesToChain(chainId, files);
    },
  });

  const main = el('div', 'editor-main');
  main.innerHTML = `
    <div class="editor-tabbar">
      <button class="btn-icon editor-tabbar__explorer" id="editor-explorer-toggle" type="button"
        aria-label="Abrir explorador de cadeias" aria-controls="editor-sidebar" aria-expanded="false"
        title="Explorador de cadeias">
        <span class="material-symbols-rounded" aria-hidden="true">menu_open</span>
      </button>
      <div class="editor-tabs" id="editor-tabs"></div>
      <button class="btn-icon editor-tabbar__new" id="editor-new-tab" type="button"
        aria-label="Novo documento" title="Novo documento">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
      </button>
    </div>
    <div class="editor-document-host" id="editor-document-host"></div>
  `;

  root.append(overlay, sidebarView.element, main);
  container.innerHTML = '';
  container.appendChild(root);

  const preventFileNavigation = (event: DragEvent): void => {
    if (Array.from(event.dataTransfer?.types ?? []).includes('Files')) {
      event.preventDefault();
    }
  };
  root.addEventListener('dragover', preventFileNavigation);
  root.addEventListener('drop', preventFileNavigation);

  const tabsElement = main.querySelector<HTMLElement>('#editor-tabs')!;
  const documentHost = main.querySelector<HTMLElement>('#editor-document-host')!;
  const newButton = main.querySelector<HTMLButtonElement>('#editor-new-tab')!;
  const explorerButton = main.querySelector<HTMLButtonElement>('#editor-explorer-toggle')!;
  const tabbar = main.querySelector<HTMLElement>('.editor-tabbar')!;
  tabbar.prepend(renderNavToggle());

  let activeDocument: ActiveDocument | null = null;
  let saving = false;
  let focusNoteEditorOnNextChain = false;

  const setSidebarOpen = (open: boolean): void => {
    root.classList.toggle('editor-view--sidebar-open', open);
    overlay.hidden = !open;
    explorerButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    explorerButton.setAttribute(
      'aria-label',
      open ? 'Fechar explorador de cadeias' : 'Abrir explorador de cadeias'
    );
  };

  const setSaving = (id: string, value: boolean): void => {
    if (activeDocument?.id !== id) return;
    if (activeDocument.kind === 'draft') activeDocument.view.setSaving(value);
    else activeDocument.view.setSaving(value);
  };

  const destroyDocument = (): void => {
    activeDocument?.view.destroy();
    activeDocument = null;
  };

  const renderEmptyDocument = (): void => {
    const empty = el('section', 'editor-empty-document');
    empty.id = 'editor-panel';
    empty.setAttribute('role', 'tabpanel');
    empty.innerHTML = `
      <span class="material-symbols-rounded editor-empty-document__icon" aria-hidden="true">edit_note</span>
      <p class="editor-empty-document__title">Nenhum documento aberto</p>
      <p class="editor-empty-document__body">Crie um rascunho ou abra uma cadeia pela lateral.</p>
      <div class="editor-empty-document__actions">
        ${renderQuickActions({ documentId: 'editor-empty-action-document' })}
      </div>
    `;
    empty
      .querySelector<HTMLButtonElement>('#editor-empty-action-document')
      ?.addEventListener('click', createDraftTab);
    documentHost.replaceChildren(empty);
  };

  const createDraftTab = (): void => {
    store.createDraftTab();
    requestAnimationFrame(() => {
      if (activeDocument?.kind === 'draft') activeDocument.view.focus();
    });
  };

  const createDocument = (tab: EditorTab): void => {
    destroyDocument();

    if (tab.kind === 'draft') {
      const view = mountDraftDocument(tab as DraftTab, {
        onInput: (value) => {
          store.updateDraftContent(tab.id, value);
          const updated = store.getTab(tab.id);
          if (updated) updateTabDirtyState(tabsElement, updated);
        },
        onContentTypeChange: (contentType) => {
          store.updateDraftContentType(tab.id, contentType);
          const updated = store.getTab(tab.id);
          if (updated) updateTabDirtyState(tabsElement, updated);
        },
      });
      activeDocument = { id: tab.id, kind: 'draft', view };
      documentHost.replaceChildren(view.element);
      return;
    }

    const view = mountChainDocument(tab as ChainTab, {
      onNoteInput: (noteTabId, value) => {
        store.updateChainNoteTab(tab.id, noteTabId, value);
        const updated = store.getTab(tab.id);
        if (updated) updateTabDirtyState(tabsElement, updated);
      },
      onContentTypeChange: (noteTabId, contentType) => {
        store.updateChainNoteContentType(tab.id, noteTabId, contentType);
      },
      onSaveNote: (noteTabId) => {
        void saveChainNoteTab(tab.id, noteTabId);
      },
        onEditNote: (noteId, options = {}) => {
          const current = store.getTab(tab.id);
          if (!current || current.kind !== 'chain') return;
          const note = current.notes.find((item) => item.id === noteId);
          if (!note) return;
          store.openChainNoteEditTab(tab.id, note, options);
          if (options.focus !== false) focusChainNoteEditor(tab.id);
        },
        onAddNoteImages: (noteId, files) => {
          if (files.length > 0) {
            void addImagesToNote(tab.chainId, noteId, files);
          }
        },
        onAddNoteAudio: (noteId) => {
          void recordAudioForNote(tab.id, tab.chainId, noteId);
        },
        onDeleteNote: (noteId) => {
          void AppController.deleteNote(tab.chainId, noteId);
        },
        onAddChainImages: (files) => {
          if (files.length > 0) {
            void addChainEndImages(tab.chainId, files);
          }
        },
        onAddChainAudio: () => {
          void recordAudioForChainEnd(tab.chainId);
        },
        onDeleteNoteAttachment: (_noteId, attachment) => {
          void deleteAttachmentFromNote(tab.chainId, attachment);
        },
        onAddNoteTag: (noteId, tagName) =>
          AppController.assignNoteTag(tab.chainId, noteId, tagName),
        onRemoveNoteTag: (noteId, tag) => {
          void AppController.removeNoteTag(tab.chainId, noteId, tag.id);
        },
        onCreateNote: () => {
        createChainNoteTab(tab.id);
      },
      onSelectNote: (noteTabId) => {
        if (store.selectChainNoteTab(tab.id, noteTabId)) {
          focusEditorTab(noteTabId);
        }
      },
      onCloseNote: (noteTabId) => {
        void requestCloseChainNoteTab(tab.id, noteTabId);
      },
      onNewDocument: () => {
        const current = store.getTab(tab.id);
        if (!current || current.kind !== 'chain') return;
        if (!current.composerCollapsed) {
          store.setChainComposerCollapsed(tab.id, true);
          return;
        }
        store.setChainComposerCollapsed(tab.id, false);
        store.ensureChainNoteTab(tab.id);
        focusChainNoteEditor(tab.id);
      },
      onImportFiles: (files) => {
        void importFilesToChain(tab.chainId, files);
      },
      onRename: () => {
        beginTabRename(tabsElement, tab.id);
      },
    });
    activeDocument = { id: tab.id, kind: 'chain', view };
    documentHost.replaceChildren(view.element);

    if (tab.status === 'idle') {
      void AppController.loadEditorChainTab(tab.id, tab.chainId);
    }
  };

  const closeTab = (id: string): void => {
    store.closeTab(id);
    const active = store.getActiveTab();
    if (active) {
      focusEditorTab(active.id);
    } else {
      newButton.focus();
    }
  };

  const focusChainNoteEditor = (chainTabId: string): void => {
    requestAnimationFrame(() => {
      if (activeDocument?.id === chainTabId && activeDocument.kind === 'chain') {
        activeDocument.view.focusNoteEditor();
      }
    });
  };

  const createChainNoteTab = (chainTabId: string): void => {
    if (!store.createChainNoteTab(chainTabId)) return;
    focusChainNoteEditor(chainTabId);
  };

  const noteTitle = (chainTabId: string, noteId: string): string => {
    const tab = store.getTab(chainTabId);
    if (!tab || tab.kind !== 'chain') return 'Nota';
    const note = tab.notes.find((item) => item.id === noteId);
    return note ? deriveEditorTitle(note.content) : 'Nota';
  };

  const addImagesToNote = async (
    chainId: string,
    noteId: string,
    files: File[]
  ): Promise<void> => {
    let added = 0;
    for (const file of files) {
      if (!(IMAGE_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
        snackbar.error('Formato de imagem não suportado.');
        continue;
      }
      if (file.size > IMAGE_ATTACHMENT_MAX_BYTES) {
        snackbar.error('A imagem excede o limite de 3 MB.');
        continue;
      }
      const dimensions = await readImageDimensions(file);
      const result = await AppController.addNoteAttachment({
        chainId,
        noteId,
        kind: 'image',
        fileName: file.name,
        mimeType: file.type,
        blob: file,
        altText: file.name,
        ...dimensions,
      });
      if (result.ok) {
        added += 1;
      }
    }

    if (added > 0) {
      snackbar.success(added === 1 ? 'Imagem anexada.' : `${added} imagens anexadas.`);
    }
  };

  const addChainEndImages = async (
    chainId: string,
    files: File[]
  ): Promise<void> => {
    let added = 0;
    for (const file of files) {
      if (!(IMAGE_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
        snackbar.error('Formato de imagem não suportado.');
        continue;
      }
      if (file.size > IMAGE_ATTACHMENT_MAX_BYTES) {
        snackbar.error('A imagem excede o limite de 3 MB.');
        continue;
      }
      const dimensions = await readImageDimensions(file);
      const result = await AppController.addChainEndAttachment({
        chainId,
        kind: 'image',
        fileName: file.name,
        mimeType: file.type,
        blob: file,
        altText: file.name,
        ...dimensions,
      });
      if (result.ok) added += 1;
    }

    if (added > 0) {
      snackbar.success(
        added === 1
          ? 'Imagem anexada ao final da cadeia.'
          : `${added} imagens anexadas ao final da cadeia.`
      );
    }
  };

  const recordAudioForChainEnd = async (chainId: string): Promise<void> => {
    await showAudioRecorderDialog({
      noteTitle: 'Final da cadeia',
      onSave: async (recorded) => {
        const result = await AppController.addChainEndAttachment({
          chainId,
          kind: 'audio',
          fileName: `audio-${Date.now()}.${extensionForAudioMime(recorded.mimeType)}`,
          mimeType: recorded.mimeType,
          blob: recorded.blob,
          duration: recorded.duration,
        });
        if (result.ok) snackbar.success('Áudio anexado ao final da cadeia.');
        return result.ok;
      },
    });
  };

  const recordAudioForNote = async (
    chainTabId: string,
    chainId: string,
    noteId: string
  ): Promise<void> => {
    await showAudioRecorderDialog({
      noteTitle: noteTitle(chainTabId, noteId),
      onSave: async (recorded) => {
        const result = await AppController.addNoteAttachment({
          chainId,
          noteId,
          kind: 'audio',
          fileName: `audio-${Date.now()}.${extensionForAudioMime(recorded.mimeType)}`,
          mimeType: recorded.mimeType,
          blob: recorded.blob,
          duration: recorded.duration,
        });
        if (result.ok) snackbar.success('Áudio anexado.');
        return result.ok;
      },
    });
  };

  const deleteAttachmentFromNote = async (
    chainId: string,
    attachment: AttachmentDTO
  ): Promise<void> => {
    const confirmed = await showConfirmDialog({
      title: 'Excluir anexo?',
      body: attachment.fileName,
      icon: 'delete',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    const deleted = await AppController.deleteNoteAttachment(chainId, attachment.id);
    if (deleted) releaseAttachmentUrl(attachment.id);
  };

  const removeChainNoteTabAndEnsure = (chainTabId: string, noteTabId: string): void => {
    store.removeChainNoteTab(chainTabId, noteTabId);

    const chainTab = store.getTab(chainTabId);
    if (chainTab?.kind === 'chain' && chainTab.noteTabs.length === 0) {
      store.setChainComposerCollapsed(chainTabId, true);
    } else {
      store.ensureChainNoteTab(chainTabId);
    }

    focusChainNoteEditor(chainTabId);
  };

  const appendChainNoteTab = async (
    chainTabId: string,
    noteTabId: string
  ): Promise<boolean> => {
    const chainTab = store.getTab(chainTabId);
    if (!chainTab || chainTab.kind !== 'chain') return false;

    const noteTab = store.getChainNoteTab(chainTabId, noteTabId);
    if (!noteTab || !noteTab.content.trim()) return false;

    const contentType = contentTypeOf(noteTab);
    const result =
      contentType === 'text'
        ? await AppController.appendToEditorChainTab(
            chainTab.chainId,
            noteTab.content
          )
        : await AppController.appendToEditorChainTab(
            chainTab.chainId,
            noteTab.content,
            contentType
          );
    if (!result.ok) return false;

    store.appendNoteToChainTab(chainTabId, result.note);
    store.removeChainNoteTab(chainTabId, noteTabId);
    store.ensureChainNoteTab(chainTabId);
    return true;
  };

  const updateChainNoteEditTab = async (
    chainTab: ChainTab,
    noteTab: ChainNoteTab
  ): Promise<boolean> => {
    if (!noteTab.editingNoteId) return false;

    const updated = await AppController.updateNoteContent(
      chainTab.chainId,
      noteTab.editingNoteId,
      noteTab.content,
      contentTypeOf(noteTab)
    );
    if (!updated) return false;

    store.removeChainNoteTab(chainTab.id, noteTab.id);
    store.ensureChainNoteTab(chainTab.id);
    return true;
  };

  const saveChainNoteTab = async (
    chainTabId: string,
    noteTabId: string
  ): Promise<boolean> => {
    if (saving) return false;

    const chainTab = store.getTab(chainTabId);
    if (!chainTab || chainTab.kind !== 'chain') return false;

    const noteTab = store.getChainNoteTab(chainTabId, noteTabId);
    if (!noteTab) return false;

    if (!noteTab.content.trim()) {
      focusChainNoteEditor(chainTabId);
      return false;
    }

    saving = true;
    setSaving(chainTabId, true);

    try {
      const editing = Boolean(noteTab.editingNoteId);
      const saved = editing
        ? await updateChainNoteEditTab(chainTab, noteTab)
        : await appendChainNoteTab(chainTabId, noteTabId);

      if (saved && !editing) snackbar.success('Nota adicionada à cadeia.');
      return saved;
    } finally {
      saving = false;
      setSaving(chainTabId, false);
      focusChainNoteEditor(chainTabId);
    }
  };

  const saveAllChainNoteTabs = async (chainTabId: string): Promise<boolean> => {
    if (saving) return false;

    const chainTab = store.getTab(chainTabId);
    if (!chainTab || chainTab.kind !== 'chain') return false;

    const noteTabIds = chainTab.noteTabs
      .filter(isChainNoteTabDirty)
      .map((noteTab) => noteTab.id);

    if (noteTabIds.length === 0) return true;

    saving = true;
    setSaving(chainTabId, true);

    try {
      let appended = 0;

      for (const noteTabId of noteTabIds) {
        const current = store.getChainNoteTab(chainTabId, noteTabId);
        if (!current || !current.content.trim()) return false;

        const saved = current.editingNoteId
          ? await updateChainNoteEditTab(chainTab, current)
          : await appendChainNoteTab(chainTabId, noteTabId);
        if (!saved) return false;
        if (!current.editingNoteId) appended += 1;
      }

      if (appended > 0) {
        snackbar.success(
          appended === 1 ? 'Nota adicionada à cadeia.' : 'Notas adicionadas à cadeia.'
        );
      }
      return true;
    } finally {
      saving = false;
      setSaving(chainTabId, false);
      focusChainNoteEditor(chainTabId);
    }
  };

  const requestCloseChainNoteTab = async (
    chainTabId: string,
    noteTabId: string
  ): Promise<void> => {
    const noteTab = store.getChainNoteTab(chainTabId, noteTabId);
    if (!noteTab) return;

    if (!isChainNoteTabDirty(noteTab)) {
      removeChainNoteTabAndEnsure(chainTabId, noteTabId);
      return;
    }

    const title = deriveEditorTitle(noteTab.content);
    const choice = await showCloseTabDialog(
      noteTab.editingNoteId
        ? title === 'Sem título'
          ? 'Nota em edição'
          : title
        : title === 'Sem título'
          ? 'Novo documento'
          : title
    );
    if (choice === 'cancel') return;
    if (choice === 'discard') {
      removeChainNoteTabAndEnsure(chainTabId, noteTabId);
      return;
    }

    await saveChainNoteTab(chainTabId, noteTabId);
  };

  const saveTab = async (id: string): Promise<boolean> => {
    if (saving) return false;

    const tab = store.getTab(id);
    if (!tab) return false;

    if (tab.kind !== 'draft' || !tab.content.trim()) {
      if (activeDocument?.id === id && activeDocument.kind === 'draft') {
        activeDocument.view.focus();
      }
      return false;
    }

    saving = true;
    setSaving(id, true);

    try {
      const content = tab.content;
      const contentType = contentTypeOf(tab);

      if (tab.target) {
        const result = await AppController.updateEditorNote(
          tab.target,
          content,
          contentType
        );
        if (!result.ok) return false;

        store.markDraftSaved(id, result.target, content);
        snackbar.success('Documento salvo.', {
          label: 'Abrir cadeia',
          onClick: () => openChainAction(result.target.chainId),
        });
        return true;
      }

      const choice = await showAppendToChainDialog({
        chains: appState.get().chainSummaries,
      });
      if (!choice) return false;

      const result = choice.chainId === null
        ? await AppController.createChainWithNote(
            choice.createTitle,
            content,
            contentType
          )
        : contentType === 'text'
          ? await AppController.saveEditorToChain(choice.chainId, content)
          : await AppController.saveEditorToChain(
              choice.chainId,
              content,
              contentType
            );
      if (!result.ok) return false;

      store.markDraftSaved(id, result.target, content);
      snackbar.success(
        choice.chainId === null
          ? 'Cadeia criada e nota adicionada.'
          : 'Nota adicionada à cadeia.',
        {
          label: 'Abrir cadeia',
          onClick: () => openChainAction(result.target.chainId),
        }
      );
      return true;
    } finally {
      saving = false;
      setSaving(id, false);
    }
  };

  const requestCloseTab = async (id: string): Promise<void> => {
    const tab = store.getTab(id);
    if (!tab) return;

    if (!isEditorTabDirty(tab)) {
      closeTab(id);
      return;
    }

    const choice = await showCloseTabDialog(tab.title);
    if (choice === 'cancel') return;
    if (choice === 'discard') {
      closeTab(id);
      return;
    }

    const saved = tab.kind === 'chain'
      ? await saveAllChainNoteTabs(id)
      : await saveTab(id);
    if (!saved) return;

    const latest = store.getTab(id);
    if (latest && isEditorTabDirty(latest)) {
      snackbar.show({
        message: 'O documento tem novas alterações não salvas.',
      });
      return;
    }

    closeTab(id);
  };

  const applyEditorFocusRequest = (): void => {
    const request = appState.get().editorFocusRequest;
    if (!request) return;

    const active = store.getActiveTab();
    if (!active || active.kind !== 'chain' || active.composerCollapsed) return;

    const noteTab = store.getActiveChainNoteTab(active.id);
    if (!noteTab || noteTab.editingNoteId !== request.noteId) return;
    if (!activeDocument || activeDocument.kind !== 'chain') return;
    if (activeDocument.id !== active.id) return;

    const documentView = activeDocument.view;
    appState.set({ editorFocusRequest: null });
    requestAnimationFrame(() => {
      const current = store.getActiveTab();
      if (!current || current.id !== active.id) return;
      documentView.focusSearchMatch(request.query);
    });
  };

  const renderSnapshot = (): void => {
    const snapshot = store.getSnapshot();

    renderEditorTabs(tabsElement, snapshot, {
      onSelect: (id) => {
        if (store.selectTab(id)) {
          focusEditorTab(id);
          const tab = store.getTab(id);
          if (tab?.kind === 'chain' && tab.status === 'idle') {
            void AppController.loadEditorChainTab(tab.id, tab.chainId);
          }
        }
      },
      onClose: (id) => {
        void requestCloseTab(id);
      },
      onCreate: createDraftTab,
      onRename: (id, title) => {
        const tab = store.getTab(id);
        if (tab?.kind === 'chain') {
          void AppController.updateChainTitle(tab.chainId, title);
        }
      },
    });

    const active = store.getActiveTab();

    if (!active) {
      destroyDocument();
      renderEmptyDocument();
      sidebarView.update(appState.get(), null);
      return;
    }

    if (!activeDocument || activeDocument.id !== active.id || activeDocument.kind !== active.kind) {
      createDocument(active);
    } else if (active.kind === 'draft' && activeDocument.kind === 'draft') {
      activeDocument.view.update(active);
    } else if (active.kind === 'chain' && activeDocument.kind === 'chain') {
      activeDocument.view.update(active);
    }

    const currentDocument = activeDocument;
    if (
      focusNoteEditorOnNextChain &&
      active.kind === 'chain' &&
      currentDocument?.kind === 'chain'
    ) {
      focusNoteEditorOnNextChain = false;
      requestAnimationFrame(() => {
        currentDocument.view.focusNoteEditor();
      });
    }

    sidebarView.update(appState.get(), activeChainId(active));
    applyEditorFocusRequest();
  };

  newButton.addEventListener('click', createDraftTab);
  tabbar.addEventListener('dblclick', (event) => {
    if (event.target !== tabbar) return;
    createDraftTab();
  });
  explorerButton.addEventListener('click', () => {
    setSidebarOpen(!root.classList.contains('editor-view--sidebar-open'));
  });
  overlay.addEventListener('click', () => setSidebarOpen(false));

  const onKeyDown = (event: KeyboardEvent): void => {
    if (appState.get().view !== 'editor') return;

    if (event.key === 'Escape') {
      if (document.querySelector('.dialog-backdrop, .content-type-menu')) return;
      if (appState.get().drawerOpen) return;
      if (isEscapeHandledByChild(event)) return;

      if (root.classList.contains('editor-view--sidebar-open')) {
        event.preventDefault();
        setSidebarOpen(false);
        return;
      }

      const active = store.getActiveTab();
      if (!active || active.kind !== 'chain' || active.composerCollapsed) return;

      const noteTab = store.getActiveChainNoteTab(active.id);
      if (!noteTab) return;

      event.preventDefault();
      void requestCloseChainNoteTab(active.id, noteTab.id);
      return;
    }

    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    if (event.key.toLowerCase() !== 's') return;

    event.preventDefault();
    if (document.querySelector('.dialog-backdrop')) return;

    const active = store.getActiveTab();
    if (!active) {
      createDraftTab();
      return;
    }

    if (active.kind === 'chain') {
      const noteTab = store.getActiveChainNoteTab(active.id);
      if (!noteTab) {
        store.ensureChainNoteTab(active.id);
        focusChainNoteEditor(active.id);
        return;
      }
      void saveChainNoteTab(active.id, noteTab.id);
      return;
    }

    void saveTab(active.id);
  };

  document.addEventListener('keydown', onKeyDown);

  const unsubscribeStore = store.subscribe(renderSnapshot);
  const unsubscribeApp = appState.subscribe((state) => {
    const active = store.getActiveTab();
    sidebarView.update(state, activeChainId(active));
    if (activeDocument?.kind === 'chain' && active?.kind === 'chain') {
      activeDocument.view.update(active);
    }
    applyEditorFocusRequest();
  });

  renderSnapshot();

  for (const tab of store.getSnapshot().tabs) {
    if (tab.kind === 'chain' && tab.status === 'idle') {
      void AppController.loadEditorChainTab(tab.id, tab.chainId);
    }
  }

  return () => {
    unsubscribeStore();
    unsubscribeApp();
    document.removeEventListener('keydown', onKeyDown);
    destroyDocument();
    root.remove();
  };
}
