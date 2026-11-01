import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { editorStore } from '../state/EditorStore.js';
import type { ChainTab, DraftTab, EditorStore, EditorTab } from '../state/EditorStore.js';
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
import { showAppendToChainDialog } from '../components/AppendToChainDialog.js';
import { showCloseTabDialog } from '../components/CloseTabDialog.js';
import { showImportTextDialog } from '../components/ImportTextDialog.js';
import { showImportTextFilesDialog } from '../components/ImportTextFilesDialog.js';
import { snackbar } from '../components/Snackbar.js';
import { togglePinnedChain } from '../app/pinnedChains.js';
import { el } from '../dom.js';
import { showComposerModal } from './menus.js';

type ActiveDocument =
  | { id: string; kind: 'draft'; view: DraftDocumentView }
  | { id: string; kind: 'chain'; view: ChainDocumentView };

let sessionInitialized = false;

export function initEditorSession(store: EditorStore = editorStore): void {
  if (sessionInitialized) return;
  sessionInitialized = true;

  window.addEventListener('beforeunload', (event) => {
    store.flush();
    if (!store.hasDirtyTabs()) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function activeChainId(tab: EditorTab | null): string | null {
  if (!tab) return null;
  return tab.kind === 'chain' ? tab.chainId : tab.target?.chainId ?? null;
}

function openChainAction(chainId: string): void {
  void AppController.openChainInEditor(chainId);
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
      void AppController.openChainInEditor(chainId);
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
      <button class="btn btn-tonal" id="editor-empty-new" type="button">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
        Novo documento
      </button>
    `;
    empty.querySelector<HTMLButtonElement>('#editor-empty-new')?.addEventListener('click', createDraftTab);
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
      onToggleComposer: () => {
        const current = store.getTab(tab.id);
        if (!current || current.kind !== 'chain') return;
        store.setChainComposerCollapsed(tab.id, !current.composerCollapsed);
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

  const removeChainNoteTabAndEnsure = (chainTabId: string, noteTabId: string): void => {
    store.removeChainNoteTab(chainTabId, noteTabId);
    store.ensureChainNoteTab(chainTabId);
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
      contentType === 'code'
        ? await AppController.appendToEditorChainTab(chainTab.chainId, noteTab.content, contentType)
        : await AppController.appendToEditorChainTab(chainTab.chainId, noteTab.content);
    if (!result.ok) return false;

    store.appendNoteToChainTab(chainTabId, result.note);
    store.removeChainNoteTab(chainTabId, noteTabId);
    store.ensureChainNoteTab(chainTabId);
    return true;
  };

  const saveChainNoteTab = async (
    chainTabId: string,
    noteTabId: string
  ): Promise<boolean> => {
    if (saving) return false;

    const noteTab = store.getChainNoteTab(chainTabId, noteTabId);
    if (!noteTab) return false;

    if (!noteTab.content.trim()) {
      focusChainNoteEditor(chainTabId);
      return false;
    }

    saving = true;
    setSaving(chainTabId, true);

    try {
      const saved = await appendChainNoteTab(chainTabId, noteTabId);
      if (saved) snackbar.success('Nota adicionada à cadeia.');
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
      .filter((noteTab) => noteTab.content.trim().length > 0)
      .map((noteTab) => noteTab.id);

    if (noteTabIds.length === 0) return true;

    saving = true;
    setSaving(chainTabId, true);

    try {
      for (const noteTabId of noteTabIds) {
        const current = store.getChainNoteTab(chainTabId, noteTabId);
        if (!current || !current.content.trim()) continue;
        const saved = await appendChainNoteTab(chainTabId, noteTabId);
        if (!saved) return false;
      }

      snackbar.success(
        noteTabIds.length === 1
          ? 'Nota adicionada à cadeia.'
          : 'Notas adicionadas à cadeia.'
      );
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
      title === 'Sem título' ? 'Novo documento' : title
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
        : contentType === 'code'
          ? await AppController.saveEditorToChain(choice.chainId, content, contentType)
          : await AppController.saveEditorToChain(choice.chainId, content);
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
  };

  newButton.addEventListener('click', createDraftTab);
  explorerButton.addEventListener('click', () => {
    setSidebarOpen(!root.classList.contains('editor-view--sidebar-open'));
  });
  overlay.addEventListener('click', () => setSidebarOpen(false));

  const onKeyDown = (event: KeyboardEvent): void => {
    if (appState.get().view !== 'editor') return;

    if (event.key === 'Escape') {
      if (!document.querySelector('.dialog-backdrop') && root.classList.contains('editor-view--sidebar-open')) {
        event.preventDefault();
        setSidebarOpen(false);
      }
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
