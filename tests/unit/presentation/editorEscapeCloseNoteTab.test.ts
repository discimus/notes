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

function pressEscape(target: EventTarget): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  );
}

describe('Editor close note edit tab with Escape', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      drawerOpen: false,
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

  async function waitForAutoPreview(
    store: EditorStore,
    chainId: string
  ): Promise<HTMLTextAreaElement> {
    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    });
    const composer = document.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    if (!composer) throw new Error('Compositor não encontrado');
    return composer;
  }

  it('fecha a aba de edição ativa e recolhe o compositor', async () => {
    const { store, chainId } = mountWithNotes([first, second]);
    const composer = await waitForAutoPreview(store, chainId);

    pressEscape(composer);

    await vi.waitFor(() => {
      const tab = store.getTab(chainId);
      if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(tab.noteTabs).toHaveLength(0);
      expect(tab.composerCollapsed).toBe(true);
    });
  });

  it('fecha a aba mesmo quando outro handler bloqueia o evento', async () => {
    const { store, chainId } = mountWithNotes([first, second]);
    const composer = await waitForAutoPreview(store, chainId);

    composer.addEventListener(
      'keydown',
      (event) => event.preventDefault(),
      { capture: true, once: true }
    );

    pressEscape(composer);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toBeNull();
    });
  });

  it('não fecha a aba ao cancelar a edição de tag com Esc', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await waitForAutoPreview(store, chainId);

    host.querySelector<HTMLButtonElement>('.tag-add')?.click();
    const tagInput = host.querySelector<HTMLInputElement>('.tag-add__input');
    if (!tagInput) throw new Error('Campo de tag não encontrado');

    pressEscape(tagInput);

    await vi.waitFor(() => {
      expect(host.querySelector('.tag-add__input')).toBeNull();
    });
    expect(findEditTab(store, chainId, 'note-2')).not.toBeNull();
  });

  it('não fecha a aba ao fechar o menu de tipo com Esc', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await waitForAutoPreview(store, chainId);

    host
      .querySelector<HTMLButtonElement>('.content-type-control__button')
      ?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.content-type-menu')).not.toBeNull();
    });

    const activeItem = document.querySelector<HTMLElement>(
      '.content-type-menu [role="menuitemradio"]'
    );
    if (!activeItem) throw new Error('Menu de tipo não encontrado');
    pressEscape(activeItem);

    await vi.waitFor(() => {
      expect(document.querySelector('.content-type-menu')).toBeNull();
    });
    expect(findEditTab(store, chainId, 'note-2')).not.toBeNull();
  });

  it('fecha apenas a aba ativa quando há mais de uma edição', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    const composer = await waitForAutoPreview(store, chainId);

    host
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__edit'
      )
      ?.click();

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-1')).toMatchObject({ preview: false });
    });

    pressEscape(composer);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-1')).toBeNull();
    });

    expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: true });
    const tab = store.getTab(chainId);
    if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(tab.composerCollapsed).toBe(false);
  });

  it('fecha uma aba de novo documento', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await waitForAutoPreview(store, chainId);

    host.querySelector<HTMLButtonElement>('#chain-note-new')?.click();

    const withDraft = store.getTab(chainId);
    if (!withDraft || withDraft.kind !== 'chain') throw new Error('Cadeia não encontrada');
    const active = withDraft.noteTabs.find(
      (noteTab) => noteTab.id === withDraft.activeNoteTabId
    );
    expect(active?.editingNoteId).toBeUndefined();

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    if (!composer) throw new Error('Compositor não encontrado');
    pressEscape(composer);

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

  it('prioriza fechar a sidebar antes da aba de edição', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);
    await waitForAutoPreview(store, chainId);

    const explorer = host.querySelector<HTMLButtonElement>('#editor-explorer-toggle');
    explorer?.click();
    expect(explorer?.getAttribute('aria-expanded')).toBe('true');

    pressEscape(document);

    expect(explorer?.getAttribute('aria-expanded')).toBe('false');
    expect(findEditTab(store, chainId, 'note-2')).not.toBeNull();

    pressEscape(document);

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toBeNull();
    });
  });

  it('não fecha a aba dirty enquanto o diálogo de confirmação estiver aberto', async () => {
    const { store, chainId } = mountWithNotes([first, second]);
    const composer = await waitForAutoPreview(store, chainId);

    composer.value = 'Segunda nota alterada';
    composer.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(() => {
      expect(findEditTab(store, chainId, 'note-2')).toMatchObject({ preview: false });
    });

    pressEscape(composer);

    await vi.waitFor(() => {
      expect(document.querySelector('.dialog-backdrop')).not.toBeNull();
    });
    expect(findEditTab(store, chainId, 'note-2')).not.toBeNull();

    pressEscape(document);

    await vi.waitFor(() => {
      expect(document.querySelector('.dialog-backdrop')).toBeNull();
    });
    expect(findEditTab(store, chainId, 'note-2')).not.toBeNull();
  });
});
