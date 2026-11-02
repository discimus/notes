import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Nota',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

describe('EditorStore snapshots leves', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('remove notas do snapshot de abas sem alterar o snapshot completo', () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto');
    store.appendNoteToChainTab(tab.id, note);

    const full = store.getSnapshot().tabs[0];
    const light = store.getTabsSnapshot().tabs[0];
    const render = store.getActiveTabForRender();

    expect(full?.kind).toBe('chain');
    expect(full?.kind === 'chain' ? full.notes : []).toHaveLength(1);
    expect(light?.kind).toBe('chain');
    expect(light?.kind === 'chain' ? light.notes : []).toHaveLength(0);
    expect(render?.kind).toBe('chain');
    expect(render?.kind === 'chain' ? render.notes : []).toHaveLength(1);
  });
});
