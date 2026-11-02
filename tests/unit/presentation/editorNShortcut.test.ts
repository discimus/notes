import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initGlobalShortcuts } from '@presentation/app/shortcuts.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

let cleanup: (() => void) | null = null;

function pressN(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'n',
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

describe('atalho N na view do editor', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [],
      chainFilterQuery: '',
      isLoading: false,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('abre o compositor da coleção ativa em vez de criar um rascunho global', () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    const chainTab = store.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });
    const draftsBefore = store
      .getSnapshot()
      .tabs.filter((tab) => tab.kind === 'draft').length;

    const event = pressN();

    const active = store.getActiveTab();
    expect(event.defaultPrevented).toBe(true);
    expect(active?.kind).toBe('chain');
    expect(active?.id).toBe(chainTab.id);
    if (active?.kind !== 'chain') throw new Error('Aba de coleção esperada.');
    expect(active.composerCollapsed).toBe(false);
    expect(active.noteTabs).toHaveLength(1);
    expect(
      store.getSnapshot().tabs.filter((tab) => tab.kind === 'draft').length
    ).toBe(draftsBefore);

    pressN();
    const toggled = store.getActiveTab();
    if (toggled?.kind !== 'chain') throw new Error('Aba de coleção esperada.');
    expect(toggled.composerCollapsed).toBe(true);
  });

  it('não alterna duas vezes quando o atalho global também está ativo', () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    store.openChainTab('chain-1', 'Projeto', { composerCollapsed: true });
    const detach = initGlobalShortcuts();

    try {
      pressN();
      const active = store.getActiveTab();
      if (active?.kind !== 'chain') throw new Error('Aba de coleção esperada.');
      expect(active.composerCollapsed).toBe(false);
      expect(active.noteTabs).toHaveLength(1);
    } finally {
      detach();
    }
  });
});
