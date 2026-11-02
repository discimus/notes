import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

let cleanup: (() => void) | null = null;

const savedNote: NoteDTO = {
  id: 'note-saved',
  content: 'Nova nota',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  contentType: 'text',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function chainDetail(): ChainDetailDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto',
    noteCount: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes: [],
  };
}

function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.dispatchEvent(event);
  return event;
}

function mountWithDraftNote() {
  const store = new EditorStore();
  const host = document.getElementById('editor-host') as HTMLElement;
  cleanup = mountEditorView(host, store);

  const chain = store.openChainTab('chain-1', 'Projeto', {
    composerCollapsed: false,
  });
  store.setChainTabNotes(chain.id, chainDetail());
  const noteTab = store.getActiveChainNoteTab(chain.id)!;
  store.updateChainNoteTab(chain.id, noteTab.id, 'Nova nota');

  return { store, chain, noteTab };
}

describe('atalhos de salvamento no compositor da coleção', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 1,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
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

  it('Ctrl+S salva a nota e mantém o documento aberto para edição', async () => {
    const { store, chain, noteTab } = mountWithDraftNote();
    const append = vi
      .spyOn(AppController, 'appendToEditorChainTab')
      .mockResolvedValue({ ok: true, note: savedNote, chainTitle: 'Projeto' });

    const event = press('s', { ctrlKey: true });

    await vi.waitFor(() => {
      expect(append).toHaveBeenCalledWith('chain-1', 'Nova nota');
      const current = store.getTab(chain.id);
      if (!current || current.kind !== 'chain') throw new Error('Coleção não encontrada.');
      const kept = current.noteTabs.find((tab) => tab.id === noteTab.id);
      expect(kept?.editingNoteId).toBe(savedNote.id);
      expect(kept?.content).toBe('Nova nota');
      expect(kept?.baseContent).toBe('Nova nota');
    });
    expect(event.defaultPrevented).toBe(true);
    expect(store.hasDirtyTabs()).toBe(false);
  });

  it('Ctrl+Enter salva a nota e fecha apenas o editor da coleção', async () => {
    const { store, chain } = mountWithDraftNote();
    const append = vi
      .spyOn(AppController, 'appendToEditorChainTab')
      .mockResolvedValue({ ok: true, note: savedNote, chainTitle: 'Projeto' });

    const event = press('Enter', { ctrlKey: true });

    await vi.waitFor(() => {
      expect(append).toHaveBeenCalledWith('chain-1', 'Nova nota');
      const current = store.getTab(chain.id);
      if (!current || current.kind !== 'chain') throw new Error('Coleção não encontrada.');
      expect(current.composerCollapsed).toBe(true);
    });
    expect(event.defaultPrevented).toBe(true);
    const current = store.getTab(chain.id);
    if (!current || current.kind !== 'chain') throw new Error('Coleção não encontrada.');
    expect(current.chainId).toBe('chain-1');
  });
});
