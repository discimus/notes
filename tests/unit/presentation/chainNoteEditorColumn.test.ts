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

describe('Chain right editor column', () => {
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

  it('abre automaticamente a edição da nota mais recente na coluna direita', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    await vi.waitFor(() => {
      const tab = store.getTab(chainId);
      if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(tab.composerCollapsed).toBe(false);
      expect(
        tab.noteTabs.find((noteTab) => noteTab.id === tab.activeNoteTabId)
          ?.editingNoteId
      ).toBe('note-2');
      expect(
        host
          .querySelector('[data-note-id="note-2"]')
          ?.classList.contains('chain-note--selected')
      ).toBe(true);
    });

    const chainTab = store.getTab(chainId);
    if (!chainTab || chainTab.kind !== 'chain') throw new Error('Cadeia não encontrada');
    const activeTab = chainTab.noteTabs.find(
      (noteTab) => noteTab.id === chainTab.activeNoteTabId
    );
    expect(activeTab?.content).toBe('Segunda nota');

    expect(
      host.querySelector('.chain-document__body > .chain-composer')
    ).not.toBeNull();
    expect(
      host.querySelector<HTMLTextAreaElement>('#chain-composer-input')?.value
    ).toBe('Segunda nota');
    expect(
      host
        .querySelector('[data-note-id="note-2"]')
        ?.classList.contains('chain-note--selected')
    ).toBe(true);
  });

  it('troca a aba de edição ao clicar no corpo de outra nota', async () => {
    const { store, host, chainId } = mountWithNotes([first, second]);

    await vi.waitFor(() => {
      const tab = store.getTab(chainId);
      if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(
        tab.noteTabs.find((noteTab) => noteTab.id === tab.activeNoteTabId)
          ?.editingNoteId
      ).toBe('note-2');
    });

    host
      .querySelector<HTMLElement>('[data-note-id="note-1"] .chain-note__body')
      ?.click();

    await vi.waitFor(() => {
      const tab = store.getTab(chainId);
      if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(
        tab.noteTabs.find((noteTab) => noteTab.id === tab.activeNoteTabId)
          ?.editingNoteId
      ).toBe('note-1');
    });

    expect(
      host.querySelector<HTMLTextAreaElement>('#chain-composer-input')?.value
    ).toBe('Primeira nota');
    expect(
      host
        .querySelector('[data-note-id="note-1"]')
        ?.classList.contains('chain-note--selected')
    ).toBe(true);
    expect(
      host
        .querySelector('[data-note-id="note-2"]')
        ?.classList.contains('chain-note--selected')
    ).toBe(false);
  });

  it('carrega nota de código no editor da coluna direita', async () => {
    const codeNote = makeNote({
      id: 'note-code',
      content: 'const value = 1;',
      position: 1,
      role: 'tail',
      contentType: 'code',
    });
    const { host, chainId, store } = mountWithNotes([first, codeNote]);

    await vi.waitFor(() => {
      const tab = store.getTab(chainId);
      if (!tab || tab.kind !== 'chain') throw new Error('Cadeia não encontrada');
      expect(
        tab.noteTabs.find((noteTab) => noteTab.id === tab.activeNoteTabId)
          ?.editingNoteId
      ).toBe('note-code');
    });

    const composer = host.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    expect(composer?.value).toBe('const value = 1;');
    expect(composer?.classList.contains('chain-composer__input--code')).toBe(true);
  });
});
