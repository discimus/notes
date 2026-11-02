import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { EditorStore, editorStore } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Primeira nota',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const detail: ChainDetailDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
  notes: [note],
};

let cleanup: (() => void) | null = null;

describe('Configuração de editor em branco ao acessar a cadeia', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [detail],
      chainFilterQuery: '',
      isLoading: false,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    for (const tab of editorStore.getSnapshot().tabs) {
      editorStore.closeTab(tab.id);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function mountChainTab(
    store: EditorStore = new EditorStore()
  ): { store: EditorStore; chainTabId: string } {
    const chain = store.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(chain.id, detail);
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    vi.advanceTimersByTime(0);
    return { store, chainTabId: chain.id };
  }

  it('mantém o editor recolhido quando a opção está desativada', () => {
    const { store, chainTabId } = mountChainTab();
    const tab = store.getTab(chainTabId);

    expect(tab?.kind === 'chain' && tab.composerCollapsed).toBe(true);
    expect(
      tab?.kind === 'chain'
        ? tab.noteTabs.filter((noteTab) => noteTab.editingNoteId)
        : []
    ).toEqual([]);
  });

  it('abre um documento em branco quando a opção está ativada', () => {
    localStorage.setItem('threadnotes.auto-open-blank-editor', 'true');
    const { store, chainTabId } = mountChainTab();
    const tab = store.getTab(chainTabId);

    expect(tab?.kind === 'chain' && tab.composerCollapsed).toBe(false);
    if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
    const active = tab.noteTabs.find(
      (noteTab) => noteTab.id === tab.activeNoteTabId
    );
    expect(active?.content).toBe('');
    expect(active?.editingNoteId).toBeUndefined();
  });

  it('aplica a opção ao reabrir uma cadeia que já estava aberta', async () => {
    for (const tab of editorStore.getSnapshot().tabs) {
      editorStore.closeTab(tab.id);
    }
    const { store, chainTabId } = mountChainTab(editorStore);
    const before = store.getTab(chainTabId);
    expect(before?.kind === 'chain' && before.composerCollapsed).toBe(true);

    localStorage.setItem('threadnotes.auto-open-blank-editor', 'true');
    await AppController.openChainInEditor('chain-1', detail);

    const after = store.getTab(chainTabId);
    expect(after?.kind === 'chain' && after.composerCollapsed).toBe(false);
    if (!after || after.kind !== 'chain') throw new Error('Cadeia não encontrada');
    const active = after.noteTabs.find(
      (noteTab) => noteTab.id === after.activeNoteTabId
    );
    expect(active?.content).toBe('');
    expect(active?.editingNoteId).toBeUndefined();
  });
});
