import { beforeEach, describe, expect, it } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import {
  PendingDraftsCache,
  PENDING_DRAFTS_STORAGE_KEY,
} from '@presentation/state/PendingDraftsCache.js';

describe('EditorStore persistent pending cache', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function createStore(): EditorStore {
    return new EditorStore(sessionStorage, new PendingDraftsCache(localStorage));
  }

  it('grava pendências no localStorage sem persistir abas sem conteúdo', () => {
    const store = createStore();
    const draft = store.createDraftTab();
    store.updateDraftContent(draft.id, 'Rascunho que deve sobreviver');
    store.updateDraftContentType(draft.id, 'code');

    const pendingChain = store.openChainTab('chain-pending', 'Com pendência');
    const pendingNote = store.getActiveChainNoteTab(pendingChain.id)!;
    store.updateChainNoteTab(pendingChain.id, pendingNote.id, 'Nota pendente');

    const emptyChain = store.openChainTab('chain-empty', 'Sem pendência');
    store.selectTab(emptyChain.id);
    store.flush();

    const raw = localStorage.getItem(PENDING_DRAFTS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tabs).toHaveLength(2);
    expect(parsed.tabs.map((tab: { id: string; chainId?: string }) => tab.chainId ?? tab.id)).toEqual([
      draft.id,
      'chain-pending',
    ]);
    expect(parsed.activeTabId).toBe(draft.id);
  });

  it('restaura apenas pendências quando a sessão do navegador não existe', () => {
    const store = createStore();
    const draft = store.createDraftTab();
    store.updateDraftContent(draft.id, 'Rascunho persistente');
    store.updateDraftContentType(draft.id, 'code');

    const chain = store.openChainTab('chain-1', 'Projeto');
    const noteTab = store.getActiveChainNoteTab(chain.id)!;
    store.updateChainNoteTab(chain.id, noteTab.id, 'Nota pendente persistente');
    store.flush();

    sessionStorage.clear();
    const restored = createStore();
    const snapshot = restored.getSnapshot();

    expect(snapshot.tabs).toHaveLength(2);
    expect(snapshot.tabs[0]?.kind).toBe('draft');
    expect(snapshot.tabs[1]?.kind).toBe('chain');

    const restoredDraft = restored.getTab(draft.id);
    expect(restoredDraft?.kind).toBe('draft');
    if (restoredDraft?.kind === 'draft') {
      expect(restoredDraft.content).toBe('Rascunho persistente');
      expect(restoredDraft.contentType).toBe('code');
    }

    const restoredChain = restored.getTab(chain.id);
    if (!restoredChain || restoredChain.kind !== 'chain') {
      throw new Error('Coleção pendente não restaurada');
    }
    expect(restoredChain.noteTabs[0]?.content).toBe('Nota pendente persistente');
    expect(restoredChain.status).toBe('idle');
  });

  it('remove a pendência persistente quando o rascunho é salvo', () => {
    const store = createStore();
    const draft = store.createDraftTab();
    store.updateDraftContent(draft.id, 'Conteúdo salvo');
    store.flush();
    expect(localStorage.getItem(PENDING_DRAFTS_STORAGE_KEY)).not.toBeNull();

    store.markDraftSaved(
      draft.id,
      { chainId: 'chain-1', noteId: 'note-1', role: 'tail', chainTitle: 'Projeto' },
      'Conteúdo salvo'
    );
    store.flush();

    expect(localStorage.getItem(PENDING_DRAFTS_STORAGE_KEY)).toBeNull();
  });

  it('prioriza a sessão atual sobre o cache persistente', () => {
    const store = createStore();
    const draft = store.createDraftTab();
    store.updateDraftContent(draft.id, 'Pendente no cache');

    const emptyChain = store.openChainTab('chain-empty', 'Aberta na sessão');
    store.selectTab(emptyChain.id);
    store.flush();

    const restored = createStore();
    expect(restored.getSnapshot().tabs.map((tab) => tab.id)).toEqual([
      draft.id,
      emptyChain.id,
    ]);
  });
});
