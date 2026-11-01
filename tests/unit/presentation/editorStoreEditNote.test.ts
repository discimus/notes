import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { EditorStore, isChainNoteTabDirty } from '@presentation/state/EditorStore.js';

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

describe('EditorStore edit note tabs', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('cria e seleciona uma aba de edição com dirty por conteúdo e tipo', () => {
    const store = new EditorStore();
    const chain = store.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });

    const editTab = store.openChainNoteEditTab(
      chain.id,
      makeNote({ contentType: 'code', content: 'const value = 1;' })
    );

    expect(editTab).toMatchObject({
      editingNoteId: 'note-1',
      content: 'const value = 1;',
      contentType: 'code',
      baseContent: 'const value = 1;',
      baseContentType: 'code',
    });

    const chainWithEdit = store.getTab(chain.id);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(chainWithEdit.composerCollapsed).toBe(false);
    expect(chainWithEdit.activeNoteTabId).toBe(editTab!.id);
    expect(isChainNoteTabDirty(editTab!)).toBe(false);

    store.updateChainNoteTab(chain.id, editTab!.id, 'const value = 2;');
    const dirtyContent = store.getChainNoteTab(chain.id, editTab!.id)!;
    expect(isChainNoteTabDirty(dirtyContent)).toBe(true);

    store.updateChainNoteTab(chain.id, editTab!.id, 'const value = 1;');
    const cleanAgain = store.getChainNoteTab(chain.id, editTab!.id)!;
    expect(isChainNoteTabDirty(cleanAgain)).toBe(false);

    store.updateChainNoteContentType(chain.id, editTab!.id, 'text');
    const dirtyType = store.getChainNoteTab(chain.id, editTab!.id)!;
    expect(isChainNoteTabDirty(dirtyType)).toBe(true);
  });

  it('não duplica a aba ao editar a mesma nota novamente', () => {
    const store = new EditorStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const note = makeNote();

    const first = store.openChainNoteEditTab(chain.id, note)!;
    const second = store.openChainNoteEditTab(chain.id, note)!;

    expect(second.id).toBe(first.id);
    const chainWithEdit = store.getTab(chain.id);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(chainWithEdit.noteTabs.filter((tab) => tab.editingNoteId === note.id)).toHaveLength(1);
  });

  it('restaura a aba de edição pela sessão', () => {
    const store = new EditorStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const editTab = store.openChainNoteEditTab(
      chain.id,
      makeNote({ content: 'Nota para restaurar' })
    )!;
    store.flush();

    const restored = new EditorStore();
    const chainTab = restored.getTab(chain.id);
    if (!chainTab || chainTab.kind !== 'chain') throw new Error('Cadeia não restaurada');

    const restoredEdit = chainTab.noteTabs.find((tab) => tab.id === editTab.id);
    expect(restoredEdit).toMatchObject({
      editingNoteId: 'note-1',
      baseContent: 'Nota para restaurar',
      baseContentType: 'text',
    });
  });
});
