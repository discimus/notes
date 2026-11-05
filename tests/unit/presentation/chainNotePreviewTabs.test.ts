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

describe('Prévia e edição da nota na coleção', () => {
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

    return { store, host, chainId: chain.id };
  }

  it('abre o preview da timeline pelo corpo sem abrir o editor', () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    host
      .querySelector<HTMLElement>('[data-note-id="note-2"] .chain-note__body')
      ?.click();

    const preview = host.querySelector<HTMLElement>('#chain-note-preview');
    expect(preview?.hidden).toBe(false);
    expect(preview?.textContent).toContain('Segunda nota');
    expect(findEditTab(store, chainId, 'note-2')).toBeNull();
  });

  it('troca o preview ao visualizar outra nota', () => {
    const { host } = mountWithNotes([first, second]);

    host
      .querySelector<HTMLElement>('[data-note-id="note-2"] .chain-note__body')
      ?.click();
    host
      .querySelector<HTMLElement>('[data-note-id="note-1"] .chain-note__preview')
      ?.click();

    const preview = host.querySelector<HTMLElement>('#chain-note-preview');
    expect(preview?.textContent).toContain('Primeira nota');
    expect(
      host
        .querySelector('[data-note-id="note-1"]')
        ?.classList.contains('chain-note--previewing')
    ).toBe(true);
  });

  it('abre o editor pela ação de editar do preview', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    host
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-2"] .chain-note__preview'
      )
      ?.click();
    host
      .querySelector<HTMLButtonElement>(
        '#chain-note-preview .timeline-preview__actions .btn'
      )
      ?.click();

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({
        preview: false,
      });
    });
    expect(host.querySelector<HTMLElement>('#chain-note-preview')?.hidden).toBe(
      true
    );
  });

  it('mantém o scroll da lista ao trocar o preview pelo editor', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    const list = host.querySelector<HTMLElement>('#chain-document-scroll')!;
    list.scrollTop = 140;

    host
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-2"] .chain-note__preview'
      )
      ?.click();
    list.scrollTop = 140;
    host
      .querySelector<HTMLButtonElement>(
        '#chain-note-preview .timeline-preview__actions .btn'
      )
      ?.click();

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).not.toBeNull();
    });
    expect(list.scrollTop).toBe(140);
  });

  it('abre o editor pelo botão de editar da nota', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    host
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__edit'
      )
      ?.click();

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-1')).toMatchObject({
        preview: false,
      });
    });
  });
});
