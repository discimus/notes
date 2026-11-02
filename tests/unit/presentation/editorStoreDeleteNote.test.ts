import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

const detail: ChainDetailDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
  notes: [note],
};

describe('EditorStore após excluir nota', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('remove a nota e fecha as abas de edição correspondentes', () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto');
    store.setChainTabNotes(tab.id, detail);
    store.openChainNoteEditTab(tab.id, note);

    store.removeNoteFromChainTabs('chain-1', note.id);

    const updated = store.findChainTab('chain-1');
    expect(updated?.notes).toEqual([]);
    expect(updated?.noteTabs).toEqual([]);
    expect(updated?.activeNoteTabId).toBeNull();
    expect(updated?.composerCollapsed).toBe(true);
  });
});
