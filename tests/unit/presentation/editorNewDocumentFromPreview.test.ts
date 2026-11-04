import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

const detail: ChainDetailDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 1,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
  notes: [
    {
      id: 'note-1',
      content: 'Nota existente',
      chainId: 'chain-1',
      position: 1,
      role: 'tail',
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
  ],
};

let cleanup: (() => void) | null = null;

describe('Novo documento a partir do preview', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [detail],
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

  it('fecha o preview e abre uma aba de documento em branco', () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(tab.id, detail);

    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    host.querySelector<HTMLButtonElement>('.chain-note__preview')?.click();
    const preview = host.querySelector<HTMLElement>('#chain-note-preview');
    expect(preview?.hidden).toBe(false);

    host.querySelector<HTMLButtonElement>('#chain-action-document')?.click();

    expect(preview?.hidden).toBe(true);
    const updated = store.getTab(tab.id);
    if (!updated || updated.kind !== 'chain') {
      throw new Error('Coleção não encontrada');
    }
    expect(updated.composerCollapsed).toBe(false);
    const active = updated.noteTabs.find(
      (noteTab) => noteTab.id === updated.activeNoteTabId
    );
    expect(active?.content).toBe('');
    expect(active?.editingNoteId).toBeUndefined();
  });
});
