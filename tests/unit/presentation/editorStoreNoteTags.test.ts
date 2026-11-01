import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainDetailDTO, NoteDTO, TagDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';

const tag: TagDTO = {
  id: 'tag-1',
  name: 'pesquisa',
  normalizedName: 'pesquisa',
  createdAt: '2026-01-01T10:00:00.000Z',
  origin: 'manual',
  chainCount: 1,
};

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  tags: [tag],
};

function detail(): ChainDetailDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto',
    noteCount: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes: [note],
  };
}

describe('EditorStore com tags de notas', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('preserva tags quando o conteúdo da nota é atualizado', () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto');
    store.setChainTabNotes(tab.id, detail());

    store.updateNoteInChainTabs('chain-1', {
      ...note,
      content: 'Conteúdo atualizado',
      tags: undefined,
    });

    const updated = store.getTab(tab.id);
    if (!updated || updated.kind !== 'chain') throw new Error('Cadeia não encontrada');
    expect(updated.notes[0]?.tags?.map((item) => item.id)).toEqual(['tag-1']);
  });
});
