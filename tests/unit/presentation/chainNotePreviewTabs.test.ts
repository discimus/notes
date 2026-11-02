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

function activeEditNoteId(store: EditorStore, chainTabId: string): string | null {
  const tab = store.getTab(chainTabId);
  if (!tab || tab.kind !== 'chain') return null;
  return (
    tab.noteTabs.find((noteTab) => noteTab.id === tab.activeNoteTabId)
      ?.editingNoteId ?? null
  );
}

function findEditTab(store: EditorStore, chainTabId: string, noteId: string) {
  const tab = store.getTab(chainTabId);
  if (!tab || tab.kind !== 'chain') return null;
  return tab.noteTabs.find((noteTab) => noteTab.editingNoteId === noteId) ?? null;
}

describe('Chain note preview tabs', () => {
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

  function clickNoteBody(host: HTMLElement, noteId: string): void {
    host
      .querySelector<HTMLElement>(`[data-note-id="${noteId}"] .chain-note__body`)
      ?.click();
  }

  async function openNotePreview(
    store: EditorStore,
    host: HTMLElement,
    chainId: string,
    noteId = 'note-2'
  ): Promise<void> {
    clickNoteBody(host, noteId);
    await vi.waitFor(() => {
      expect(activeEditNoteId(store, chainId)).toBe(noteId);
    });
  }

  it('abre a nota mais recente como prévia substituível ao clicar', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await openNotePreview(store, host, chainId);

    const editTab = findEditTab(store, chainId, 'note-2');
    expect(editTab).toMatchObject({ preview: true });

    const wrapper = host.querySelector<HTMLElement>(
      `#chain-note-tabs [data-tab-id="${editTab!.id}"]`
    );
    const button = wrapper?.querySelector<HTMLButtonElement>('[role="tab"]');
    expect(wrapper?.classList.contains('editor-tab--preview')).toBe(true);
    expect(button?.getAttribute('aria-description')).toContain('prévia substituível');
    expect(button?.getAttribute('aria-description')).toContain('dois cliques');
    expect(
      host.querySelector<HTMLElement>('[data-note-id="note-1"] .chain-note__body')?.title
    ).toContain('clique duas vezes');
  });

  it('substitui a prévia limpa ao clicar uma vez em outra nota', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await openNotePreview(store, host, chainId);

    clickNoteBody(host, 'note-1');

    await vi.waitFor(() => {
      expect(activeEditNoteId(store, chainId)).toBe('note-1');
    });

    const chainTab = store.getTab(chainId);
    if (!chainTab || chainTab.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(chainTab.noteTabs.map((noteTab) => noteTab.editingNoteId)).toEqual([
      'note-1',
    ]);
    expect(findEditTab(store, chainId, 'note-2')).toBeNull();
    expect(findEditTab(store, chainId, 'note-1')).toMatchObject({ preview: true });
  });

  it('mantém a aba aberta ao clicar duas vezes na nota', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await openNotePreview(store, host, chainId);

    clickNoteBody(host, 'note-1');
    clickNoteBody(host, 'note-1');

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-1')).toMatchObject({
        preview: false,
      });
    });

    clickNoteBody(host, 'note-2');

    await vi.waitFor(() => {
      expect(activeEditNoteId(store, chainId)).toBe('note-2');
    });

    expect(findEditTab(store, chainId, 'note-1')).toMatchObject({ preview: false });
    expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
  });

  it('abre a nota pelo botão de editar como aba persistente', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await openNotePreview(store, host, chainId);

    host
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__edit'
      )
      ?.click();

    await vi.waitFor(() => {
      expect(activeEditNoteId(store, chainId)).toBe('note-1');
    });

    expect(findEditTab(store, chainId, 'note-1')).toMatchObject({ preview: false });
    expect(findEditTab(store, chainId, 'note-2')).toBeNull();
    const chainTab = store.getTab(chainId);
    if (!chainTab || chainTab.kind !== 'chain') {
      throw new Error('Cadeia não encontrada');
    }
    expect(chainTab.noteTabs).toHaveLength(1);
  });

  it('promove a prévia ao editar o conteúdo e remove a marcação visual', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await openNotePreview(store, host, chainId);

    const editTab = findEditTab(store, chainId, 'note-2')!;
    expect(editTab.preview).toBe(true);

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    if (!composer) throw new Error('Compositor não encontrado');
    composer.value = 'Segunda nota atualizada';
    composer.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({
        preview: false,
      });
    });

    expect(
      host.querySelector<HTMLElement>(
        `#chain-note-tabs [data-tab-id="${editTab.id}"]`
      )?.classList.contains('editor-tab--preview')
    ).toBe(false);
  });
});
