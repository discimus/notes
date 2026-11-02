import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';

let cleanup: (() => void) | null = null;

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Primeira nota',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

const first = makeNote();
const second = makeNote({
  id: 'note-2',
  content: 'Segunda nota',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-02T11:00:00.000Z',
  updatedAt: '2026-01-02T11:00:00.000Z',
});

function makeChainDetail(notes: NoteDTO[]): ChainDetailDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto principal',
    noteCount: notes.length,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: notes[notes.length - 1]?.updatedAt ?? '2026-01-01T10:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes,
  };
}

function findEditTab(store: EditorStore, chainTabId: string, noteId: string) {
  const tab = store.getTab(chainTabId);
  if (!tab || tab.kind !== 'chain') return null;
  return tab.noteTabs.find((noteTab) => noteTab.editingNoteId === noteId) ?? null;
}

describe('Chain note history outside click', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
          noteCount: 2,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
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

  function mountWithNotes(notes: NoteDTO[]) {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(chain.id, makeChainDetail(notes));

    const latestNote = notes[notes.length - 1];
    if (latestNote) {
      host
        .querySelector<HTMLElement>(
          `[data-note-id="${latestNote.id}"] .chain-note__body`
        )
        ?.click();
    }

    return { store, host, chainId: chain.id };
  }

  it('fecha a aba de edição ativa ao clicar no espaço vazio da lista', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    });

    host.querySelector<HTMLElement>('#chain-history')?.click();

    await vi.waitFor(() => {
      const tab = store.getTab(chainId);
      if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(tab.noteTabs).toHaveLength(0);
      expect(tab.composerCollapsed).toBe(true);
    });
  });

  it('fecha a aba de edição ativa ao clicar nos metadados de uma nota', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    });

    host
      .querySelector<HTMLElement>('[data-note-id="note-1"] .chain-note__time')
      ?.click();

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toBeNull();
    });
  });

  it('não fecha a aba ao clicar no corpo de outra nota', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    });

    host
      .querySelector<HTMLElement>('[data-note-id="note-1"] .chain-note__body')
      ?.click();

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-1')).toMatchObject({ preview: true });
    });

    const tab = store.getTab(chainId);
    if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(tab.composerCollapsed).toBe(false);
    expect(findEditTab(store, chainId, 'note-2')).toBeNull();
  });

  it('remove a prévia automática ao editar outra nota', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    });

    host
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__edit'
      )
      ?.click();

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-1')).toMatchObject({ preview: false });
    });

    expect(findEditTab(store, chainId, 'note-2')).toBeNull();
  });

  it('fecha a aba de novo documento ao clicar fora do corpo', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    });

    host.querySelector<HTMLButtonElement>('#chain-note-new')?.click();

    const withDraft = store.getTab(chainId);
    if (!withDraft || withDraft.kind !== 'chain') throw new Error('Cadeia não encontrada');
    const active = withDraft.noteTabs.find(
      (noteTab) => noteTab.id === withDraft.activeNoteTabId
    );
    expect(active?.editingNoteId).toBeUndefined();

    host.querySelector<HTMLElement>('#chain-history')?.click();

    await vi.waitFor(() => {
      const after = store.getTab(chainId);
      if (!after || after.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(after.noteTabs.some((noteTab) => noteTab.id === active?.id)).toBe(false);
    });

    const after = store.getTab(chainId);
    if (!after || after.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    expect(after.composerCollapsed).toBe(false);
  });
});
