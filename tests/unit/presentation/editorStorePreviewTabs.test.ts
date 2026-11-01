import { beforeEach, describe, expect, it } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { PendingDraftsCache } from '@presentation/state/PendingDraftsCache.js';

describe('EditorStore preview tabs', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function createStore(): EditorStore {
    return new EditorStore(sessionStorage, new PendingDraftsCache(localStorage));
  }

  it('substitui a prévia limpa anterior preservando a posição da aba', () => {
    const store = createStore();
    const draft = store.createDraftTab();
    const first = store.openChainTab('chain-1', 'Primeira', { preview: true });
    const second = store.openChainTab('chain-2', 'Segunda', { preview: true });
    const snapshot = store.getSnapshot();

    expect(snapshot.tabs.map((tab) => tab.id)).toEqual([draft.id, second.id]);
    expect(store.getTab(first.id)).toBeNull();
    expect(store.getTab(second.id)).toMatchObject({ preview: true });
  });

  it('promove uma prévia existente ao abrir sem preview', () => {
    const store = createStore();
    const tab = store.openChainTab('chain-1', 'Projeto', { preview: true });

    const reopened = store.openChainTab('chain-1', 'Projeto', { preview: false });

    expect(reopened.id).toBe(tab.id);
    expect(store.getTab(tab.id)).toMatchObject({ preview: false });
  });

  it('promove automaticamente a prévia quando recebe conteúdo', () => {
    const store = createStore();
    const tab = store.openChainTab('chain-1', 'Projeto', { preview: true });
    const note = store.getActiveChainNoteTab(tab.id)!;

    store.updateChainNoteTab(tab.id, note.id, 'Rascunho');

    expect(store.getTab(tab.id)).toMatchObject({ preview: false });
  });

  it('não substitui uma prévia que virou persistente', () => {
    const store = createStore();
    const pinned = store.openChainTab('chain-1', 'Projeto', { preview: true });
    const note = store.getActiveChainNoteTab(pinned.id)!;
    store.updateChainNoteTab(pinned.id, note.id, 'Conteúdo pendente');

    const other = store.openChainTab('chain-2', 'Outra', { preview: true });

    expect(store.getTab(pinned.id)).not.toBeNull();
    expect(store.getTab(other.id)).toMatchObject({ preview: true });
  });

  it('mantém abas persistentes ao navegar por prévias', () => {
    const store = createStore();
    const persistent = store.openChainTab('chain-1', 'Persistente');
    const preview = store.openChainTab('chain-2', 'Prévia', { preview: true });
    const next = store.openChainTab('chain-3', 'Próxima', { preview: true });

    expect(store.getTab(persistent.id)).not.toBeNull();
    expect(store.getTab(preview.id)).toBeNull();
    expect(store.getTab(next.id)).toMatchObject({ preview: true });
  });

  it('restaura a marcação de prévia pela sessão', () => {
    const store = createStore();
    const tab = store.openChainTab('chain-1', 'Projeto', { preview: true });
    store.flush();

    const restored = createStore();

    expect(restored.getTab(tab.id)).toMatchObject({ preview: true });
  });
});
