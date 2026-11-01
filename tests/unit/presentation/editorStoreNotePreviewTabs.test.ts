import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { PendingDraftsCache } from '@presentation/state/PendingDraftsCache.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteúdo original',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('EditorStore note preview tabs', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function createStore(): EditorStore {
    return new EditorStore(sessionStorage, new PendingDraftsCache(localStorage));
  }

  it('substitui a prévia de edição limpa preservando a posição entre abas', () => {
    const store = createStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const persistent = store.openChainNoteEditTab(chain.id, makeNote())!;
    const preview = store.openChainNoteEditTab(
      chain.id,
      makeNote({ id: 'note-2', content: 'Segunda' }),
      { preview: true }
    )!;

    const next = store.openChainNoteEditTab(
      chain.id,
      makeNote({ id: 'note-3', content: 'Terceira' }),
      { preview: true }
    )!;

    const chainTab = store.getTab(chain.id);
    if (!chainTab || chainTab.kind !== 'chain') throw new Error('Cadeia não encontrada');

    expect(chainTab.noteTabs.map((tab) => tab.id)).toEqual([persistent.id, next.id]);
    expect(store.getChainNoteTab(chain.id, preview.id)).toBeNull();
    expect(store.getChainNoteTab(chain.id, next.id)).toMatchObject({ preview: true });
    expect(chainTab.activeNoteTabId).toBe(next.id);
  });

  it('promove a prévia ao abrir a mesma nota sem preview', () => {
    const store = createStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const note = makeNote();
    const preview = store.openChainNoteEditTab(chain.id, note, { preview: true })!;

    const reopened = store.openChainNoteEditTab(chain.id, note)!;

    expect(reopened.id).toBe(preview.id);
    expect(store.getChainNoteTab(chain.id, preview.id)).toMatchObject({
      preview: false,
    });
  });

  it('não rebaixa uma aba persistente ao abrir a prévia da mesma nota', () => {
    const store = createStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const note = makeNote();
    const persistent = store.openChainNoteEditTab(chain.id, note)!;

    store.openChainNoteEditTab(chain.id, note, { preview: true });

    expect(store.getChainNoteTab(chain.id, persistent.id)).toMatchObject({
      preview: false,
    });
  });

  it('promove a prévia dirty em vez de descartá-la ao abrir outra nota', () => {
    const store = createStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const preview = store.openChainNoteEditTab(chain.id, makeNote(), {
      preview: true,
    })!;
    store.updateChainNoteTab(chain.id, preview.id, 'Alterada');

    const next = store.openChainNoteEditTab(
      chain.id,
      makeNote({ id: 'note-2', content: 'Outra' }),
      { preview: true }
    )!;

    expect(store.getChainNoteTab(chain.id, preview.id)).toMatchObject({
      preview: false,
      content: 'Alterada',
    });
    expect(store.getChainNoteTab(chain.id, next.id)).toMatchObject({ preview: true });
  });

  it('promove a prévia ao trocar o tipo de conteúdo', () => {
    const store = createStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const preview = store.openChainNoteEditTab(chain.id, makeNote(), {
      preview: true,
    })!;

    store.updateChainNoteContentType(chain.id, preview.id, 'code');

    expect(store.getChainNoteTab(chain.id, preview.id)).toMatchObject({
      preview: false,
      contentType: 'code',
    });
  });

  it('restaura a marcação de prévia da edição pela sessão', () => {
    const store = createStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const preview = store.openChainNoteEditTab(chain.id, makeNote(), {
      preview: true,
    })!;
    store.flush();

    const restored = createStore();
    const chainTab = restored.getTab(chain.id);
    if (!chainTab || chainTab.kind !== 'chain') throw new Error('Cadeia não restaurada');

    expect(
      chainTab.noteTabs.find((tab) => tab.id === preview.id)
    ).toMatchObject({ preview: true });
  });
});
