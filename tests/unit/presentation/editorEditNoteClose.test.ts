import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';

let cleanup: (() => void) | null = null;

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo original',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function makeChainDetail(): ChainDetailDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto principal',
    noteCount: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: note.updatedAt,
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes: [note],
  };
}

describe('Editor close note edit tab', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
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

  it('remove a aba vazia de novo documento ao abrir a edição', () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(chain.id, makeChainDetail());

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    const tabs = host.querySelectorAll('#chain-note-tabs [role="tab"]');
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.textContent).toContain('Conteúdo original');
  });

  it('recolhe todo o compositor ao fechar a aba de edição', async () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(chain.id, makeChainDetail());

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    const chainWithEdit = store.getTab(chain.id);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('Cadeia não encontrada');
    const editTab = chainWithEdit.noteTabs.find((tab) => tab.editingNoteId === note.id);
    if (!editTab) throw new Error('Aba de edição não encontrada');

    host
      .querySelector<HTMLButtonElement>(
        `#chain-note-tabs [data-tab-id="${editTab.id}"] .editor-tab__close`
      )
      ?.click();

    await vi.waitFor(() => {
      const after = store.getTab(chain.id);
      if (!after || after.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(after.noteTabs).toHaveLength(0);
      expect(after.composerCollapsed).toBe(true);
    });

    expect(
      host.querySelector<HTMLElement>('#chain-composer-body')?.hidden
    ).toBe(true);
    expect(
      host.querySelector<HTMLElement>('#editor-panel')?.classList.contains(
        'chain-document--notes-collapsed'
      )
    ).toBe(true);
  });

  it('recolhe o compositor ao fechar a aba vazia Novo documento', async () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: false,
    });
    store.setChainTabNotes(chain.id, makeChainDetail());

    const chainTab = store.getTab(chain.id);
    if (!chainTab || chainTab.kind !== 'chain') throw new Error('Cadeia não encontrada');
    const blankTab = chainTab.noteTabs.find(
      (tab) => !tab.editingNoteId && !tab.content.trim()
    );
    if (!blankTab) throw new Error('Aba vazia não encontrada');

    host
      .querySelector<HTMLButtonElement>(
        `#chain-note-tabs [data-tab-id="${blankTab.id}"] .editor-tab__close`
      )
      ?.click();

    await vi.waitFor(() => {
      const after = store.getTab(chain.id);
      if (!after || after.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(after.noteTabs).toHaveLength(0);
      expect(after.composerCollapsed).toBe(true);
    });

    expect(host.querySelector<HTMLElement>('#chain-composer-body')?.hidden).toBe(
      true
    );
  });
});
