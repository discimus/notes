import { beforeEach, describe, expect, it } from 'vitest';
import {
  contentTypeOf,
  EditorStore,
  normalizeContentType,
} from '@presentation/state/EditorStore.js';

describe('EditorStore — Markdown', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('aceita Markdown e normaliza valores desconhecidos para texto', () => {
    expect(normalizeContentType('markdown')).toBe('markdown');
    expect(normalizeContentType('yaml')).toBe('text');

    const store = new EditorStore();
    const draft = store.createDraftTab();
    store.updateDraftContentType(draft.id, 'markdown');

    const updated = store.getTab(draft.id);
    expect(updated?.kind === 'draft' && contentTypeOf(updated)).toBe(
      'markdown'
    );
  });

  it('persiste e restaura Markdown em rascunhos e notas pendentes', () => {
    const store = new EditorStore();
    const draft = store.createDraftTab();
    store.updateDraftContent(draft.id, '# Título');
    store.updateDraftContentType(draft.id, 'markdown');

    const chain = store.openChainTab('chain-1', 'Projeto');
    const noteTab = store.getActiveChainNoteTab(chain.id)!;
    store.updateChainNoteTab(chain.id, noteTab.id, '- item');
    store.updateChainNoteContentType(chain.id, noteTab.id, 'markdown');
    store.flush();

    const restored = new EditorStore();
    const restoredDraft = restored.getTab(draft.id);
    expect(
      restoredDraft?.kind === 'draft' && contentTypeOf(restoredDraft)
    ).toBe('markdown');

    const restoredChain = restored.getTab(chain.id);
    if (!restoredChain || restoredChain.kind !== 'chain') {
      throw new Error('Coleção restaurada não encontrada');
    }
    expect(contentTypeOf(restoredChain.noteTabs[0]!)).toBe('markdown');
  });
});
