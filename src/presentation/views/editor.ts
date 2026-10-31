import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { editorStore } from '../state/EditorStore.js';
import type { ChainTab, DraftTab, EditorStore, EditorTab } from '../state/EditorStore.js';
import { isEditorTabDirty } from '../state/EditorStore.js';
import {
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
import { snackbar } from '../components/Snackbar.js';
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

  const sidebarView = mountEditorSidebar({
    onOpenChain: (chainId) => {
      focusComposerOnNextChain = true;
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

  const tabsElement = main.querySelector<HTMLElement>('#editor-tabs')!;
  const documentHost = main.querySelector<HTMLElement>('#editor-document-host')!;
  const newButton = main.querySelector<HTMLButtonElement>('#editor-new-tab')!;
  const explorerButton = main.querySelector<HTMLButtonElement>('#editor-explorer-toggle')!;

  let activeDocument: ActiveDocument | null = null;
  let saving = false;
  let focusComposerOnNextChain = false;

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
    if (activeDocument?.kind === 'chain') activeDocument.view.destroy();
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
        onSave: () => {
          void saveTab(tab.id);
        },
      });
      activeDocument = { id: tab.id, kind: 'draft', view };
      documentHost.replaceChildren(view.element);
      return;
    }

    const view = mountChainDocument(tab as ChainTab, {
      onComposerInput: (value) => {
        store.updateComposer(tab.id, value);
        const updated = store.getTab(tab.id);
        if (updated) updateTabDirtyState(tabsElement, updated);
      },
      onAppend: () => {
        void saveTab(tab.id);
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

  const saveTab = async (id: string): Promise<boolean> => {
    if (saving) return false;

    const tab = store.getTab(id);
    if (!tab) return false;

    if (tab.kind === 'draft' && !tab.content.trim()) {
      if (activeDocument?.id === id && activeDocument.kind === 'draft') {
        activeDocument.view.focus();
      }
      return false;
    }

    if (tab.kind === 'chain' && !tab.composer.trim()) {
      if (activeDocument?.id === id && activeDocument.kind === 'chain') {
        activeDocument.view.focusComposer();
      }
      return false;
    }

    saving = true;
    setSaving(id, true);

    try {
      if (tab.kind === 'draft') {
        const content = tab.content;

        if (tab.target) {
          const result = await AppController.updateEditorNote(tab.target, content);
          if (!result.ok) return false;

          store.markDraftSaved(id, result.target, content);
          snackbar.success('Documento salvo.', {
            label: 'Abrir cadeia',
            onClick: () => openChainAction(result.target.chainId),
          });
          return true;
        }

        const chain = await showAppendToChainDialog({
          chains: appState.get().chainSummaries,
        });
        if (!chain) return false;

        const result = await AppController.saveEditorToChain(chain.chainId, content);
        if (!result.ok) return false;

        store.markDraftSaved(id, result.target, content);
        snackbar.success('Nota adicionada à cadeia.', {
          label: 'Abrir cadeia',
          onClick: () => openChainAction(result.target.chainId),
        });
        return true;
      }

      const content = tab.composer;
      const result = await AppController.appendToEditorChainTab(tab.chainId, content);
      if (!result.ok) return false;

      store.appendNoteToChainTab(id, result.note);
      store.settleComposerAfterAppend(id, content);

      if (activeDocument?.id === id && activeDocument.kind === 'chain') {
        activeDocument.view.clearComposerIf(content);
      }

      snackbar.success('Nota adicionada à cadeia.');
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

    const saved = await saveTab(id);
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
      focusComposerOnNextChain &&
      active.kind === 'chain' &&
      currentDocument?.kind === 'chain'
    ) {
      focusComposerOnNextChain = false;
      requestAnimationFrame(() => {
        currentDocument.view.focusComposer();
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
