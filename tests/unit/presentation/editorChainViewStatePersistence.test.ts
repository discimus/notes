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

function makeChainDetail(chainId: string, notes: NoteDTO[]): ChainDetailDTO {
  return {
    id: chainId,
    displayTitle: chainId === 'chain-1' ? 'Projeto principal' : 'Outra coleção',
    noteCount: notes.length,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: notes[notes.length - 1]?.updatedAt ?? '2026-01-01T10:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes,
  };
}

function preview(host: HTMLElement): HTMLElement {
  return host.querySelector<HTMLElement>('#chain-note-preview')!;
}

describe('Estado da coleção ao trocar de aba', () => {
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
        {
          id: 'chain-2',
          displayTitle: 'Outra coleção',
          noteCount: 1,
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

  function mountWithChains() {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(
      chain.id,
      makeChainDetail('chain-1', [
        makeNote(),
        makeNote({
          id: 'note-2',
          content: 'Segunda nota',
          position: 1,
          role: 'tail',
          createdAt: '2026-01-02T11:00:00.000Z',
          updatedAt: '2026-01-02T11:00:00.000Z',
        }),
      ])
    );

    return { store, host, chainId: chain.id };
  }

  it('mantém a prévia aberta ao voltar de uma nova aba global', () => {
    const { store, host, chainId } = mountWithChains();

    host
      .querySelector<HTMLElement>('[data-note-id="note-2"] .chain-note__body')
      ?.click();
    expect(preview(host).hidden).toBe(false);
    expect(preview(host).textContent).toContain('Segunda nota');

    store.createDraftTab();
    expect(host.querySelector('#chain-note-preview')).toBeNull();

    store.selectTab(chainId);

    expect(preview(host).hidden).toBe(false);
    expect(preview(host).textContent).toContain('Segunda nota');
    expect(
      host
        .querySelector('[data-note-id="note-2"]')
        ?.classList.contains('chain-note--previewing')
    ).toBe(true);
  });

  it('mantém a prévia de cada coleção ao alternar entre elas', () => {
    const { store, host, chainId } = mountWithChains();

    host
      .querySelector<HTMLElement>('[data-note-id="note-1"] .chain-note__body')
      ?.click();
    expect(preview(host).textContent).toContain('Primeira nota');

    const other = store.openChainTab('chain-2', 'Outra coleção', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(
      other.id,
      makeChainDetail('chain-2', [
        makeNote({
          id: 'note-other',
          chainId: 'chain-2',
          content: 'Nota da outra coleção',
        }),
      ])
    );
    expect(preview(host).hidden).toBe(true);

    store.selectTab(chainId);

    expect(preview(host).hidden).toBe(false);
    expect(preview(host).textContent).toContain('Primeira nota');
  });
});
