import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

const note: NoteDTO = {
  id: 'note-pasted',
  content: 'Texto colado',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const detail: ChainDetailDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
  notes: [],
};

let cleanup: (() => void) | null = null;

describe('Colar texto como nota', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [detail],
      chainFilterQuery: '',
      isLoading: false,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    document.body.innerHTML = '';
  });

  it('lê texto da área de transferência e anexa como nova nota', async () => {
    const readText = vi.fn().mockResolvedValue('  Texto colado  ');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });
    const append = vi
      .spyOn(AppController, 'appendToEditorChainTab')
      .mockResolvedValue({ ok: true, note, chainTitle: 'Projeto' });

    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto');
    store.setChainTabNotes(tab.id, detail);

    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    host.querySelector<HTMLButtonElement>('#chain-action-link')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(readText).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith('chain-1', 'Texto colado');
    const updated = store.findChainTab('chain-1');
    expect(updated?.notes.map((item) => item.id)).toContain('note-pasted');
  });
});
