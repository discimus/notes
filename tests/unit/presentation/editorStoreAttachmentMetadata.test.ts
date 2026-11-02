import { beforeEach, describe, expect, it } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';

describe('metadados de anexos nas abas', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('preserva anexos ao atualizar apenas o conteúdo da nota', () => {
    const store = new EditorStore();
    const chain = store.openChainTab('chain-1', 'Projeto');
    const note = {
      id: 'note-1',
      content: 'Conteúdo original',
      chainId: 'chain-1',
      position: 1,
      role: 'tail' as const,
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
      attachments: [
        {
          id: 'image-1',
          noteId: 'note-1',
          chainId: 'chain-1',
          kind: 'image' as const,
          fileName: 'print.png',
          mimeType: 'image/png',
          byteSize: 10,
          createdAt: '2026-01-02T10:00:00.000Z',
        },
      ],
    };

    store.setChainTabNotes(chain.id, {
      id: 'chain-1',
      displayTitle: 'Projeto',
      noteCount: 1,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
      tagIds: [],
      tags: [],
      headerExcerpt: '',
      notes: [note],
    });

    store.updateNoteInChainTabs('chain-1', {
      ...note,
      content: 'Conteúdo atualizado',
      attachments: undefined,
      updatedAt: '2026-01-02T11:00:00.000Z',
    });

    const updated = store.getTab(chain.id);
    if (!updated || updated.kind !== 'chain') throw new Error('Coleção não encontrada');
    expect(updated.notes[0]?.attachments).toMatchObject([{ id: 'image-1' }]);
  });
});
