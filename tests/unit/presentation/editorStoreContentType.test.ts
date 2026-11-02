import { beforeEach, describe, expect, it } from 'vitest';
import {
  contentTypeOf,
  EditorStore,
  isEditorTabDirty,
} from '@presentation/state/EditorStore.js';

describe('EditorStore content type', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('cria rascunhos como texto e altera para código', () => {
    const store = new EditorStore();
    const draft = store.createDraftTab();

    expect(contentTypeOf(draft)).toBe('text');
    store.updateDraftContentType(draft.id, 'code');

    const updated = store.getTab(draft.id);
    expect(updated?.kind === 'draft' && contentTypeOf(updated)).toBe('code');
  });

  it('considera mudança de tipo dirty após o primeiro salvamento', () => {
    const store = new EditorStore();
    const draft = store.createDraftTab();
    store.updateDraftContent(draft.id, 'const value = 1;');
    store.updateDraftContentType(draft.id, 'code');
    store.markDraftSaved(
      draft.id,
      { chainId: 'chain-1', noteId: 'note-1', role: 'tail' },
      'const value = 1;'
    );

    const saved = store.getTab(draft.id);
    if (!saved) throw new Error('Rascunho não encontrado');
    expect(isEditorTabDirty(saved)).toBe(false);

    store.updateDraftContentType(draft.id, 'text');
    const changed = store.getTab(draft.id);
    if (!changed) throw new Error('Rascunho não encontrado');
    expect(isEditorTabDirty(changed)).toBe(true);
  });

  it('persiste o tipo de rascunhos e notas pendentes', () => {
    const store = new EditorStore();
    const draft = store.createDraftTab();
    store.updateDraftContent(draft.id, 'const value = 1;');
    store.updateDraftContentType(draft.id, 'code');

    const chain = store.openChainTab('chain-1', 'Projeto');
    const noteTab = store.getActiveChainNoteTab(chain.id)!;
    store.updateChainNoteTab(chain.id, noteTab.id, 'return value;');
    store.updateChainNoteContentType(chain.id, noteTab.id, 'code');
    store.flush();

    const restored = new EditorStore();
    const restoredDraft = restored.getTab(draft.id);
    expect(restoredDraft?.kind === 'draft' && contentTypeOf(restoredDraft)).toBe('code');

    const restoredChain = restored.getTab(chain.id);
    if (!restoredChain || restoredChain.kind !== 'chain') {
      throw new Error('Coleção restaurada não encontrada');
    }
    expect(contentTypeOf(restoredChain.noteTabs[0]!)).toBe('code');
  });

  it('usa texto ao restaurar dados antigos sem contentType', () => {
    sessionStorage.setItem(
      'threadnotes.editor.tabs',
      JSON.stringify({
        activeTabId: 'legacy',
        tabs: [
          {
            kind: 'draft',
            id: 'legacy',
            title: 'Legado',
            content: 'Texto',
            savedContent: 'Texto',
            target: null,
          },
        ],
      })
    );

    const store = new EditorStore();
    const tab = store.getActiveTab();
    expect(tab?.kind === 'draft' && contentTypeOf(tab)).toBe('text');
  });
});
