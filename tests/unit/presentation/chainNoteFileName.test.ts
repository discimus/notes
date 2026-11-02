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
    content: 'Conteúdo original',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    sourceFileName: 'relatorio.md',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeChainDetail(note: NoteDTO): ChainDetailDTO {
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

describe('nome de arquivo nas abas de nota', () => {
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

  function mountWithNote(note: NoteDTO) {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(chain.id, makeChainDetail(note));

    return { store, host, chainId: chain.id };
  }

  it('usa o nome do arquivo no nome da aba de edição', async () => {
    const note = makeNote();
    const { host, chainId, store } = mountWithNote(note);

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    await vi.waitFor(() => {
      expect(
        host.querySelector('#chain-note-tabs .editor-tab__label')?.textContent
      ).toBe('relatorio.md');
    });

    const chainTab = store.getTab(chainId);
    if (!chainTab || chainTab.kind !== 'chain') throw new Error('Coleção não encontrada');
    expect(
      chainTab.noteTabs.find((tab) => tab.editingNoteId === note.id)?.sourceFileName
    ).toBe('relatorio.md');
  });

  it('permite renomear o arquivo com duplo clique na aba', async () => {
    const note = makeNote();
    const { host } = mountWithNote(note);
    const rename = vi
      .spyOn(AppController, 'renameNoteFile')
      .mockResolvedValue(true);

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    await vi.waitFor(() => {
      expect(
        host.querySelector('#chain-note-tabs .editor-tab__label')?.textContent
      ).toBe('relatorio.md');
    });

    const label = host.querySelector<HTMLElement>(
      '#chain-note-tabs .editor-tab__label'
    );
    label?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const input = host.querySelector<HTMLInputElement>('.editor-tab__rename-input');
    expect(input?.value).toBe('relatorio.md');
    expect(input?.getAttribute('aria-label')).toBe('Renomear arquivo');

    if (!input) throw new Error('Input de rename não encontrado');
    input.value = 'relatorio-final.md';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    await vi.waitFor(() => {
      expect(rename).toHaveBeenCalledWith('chain-1', 'note-1', 'relatorio-final.md');
    });
  });
});
