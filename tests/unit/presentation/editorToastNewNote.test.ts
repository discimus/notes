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

describe('Toast de nova nota', () => {
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

  it('oferece "Clique aqui" e só então leva o usuário à nota', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: vi.fn().mockResolvedValue('Texto colado') },
    });
    vi.spyOn(AppController, 'appendToEditorChainTab').mockResolvedValue({
      ok: true,
      note,
      chainTitle: 'Projeto',
    });

    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto');
    store.setChainTabNotes(tab.id, detail);

    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);
    host.querySelector<HTMLButtonElement>('#chain-action-link')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const action = [...document.querySelectorAll<HTMLButtonElement>('.snackbar__action')]
      .find((button) => button.textContent === 'Clique aqui');
    expect(action).toBeDefined();

    const article = host.querySelector<HTMLElement>(
      '.chain-note[data-note-id="note-pasted"]'
    );
    expect(article?.classList.contains('chain-note--new-flash')).toBe(false);

    action?.click();

    await vi.waitFor(() => {
      expect(
        host
          .querySelector<HTMLElement>('.chain-note[data-note-id="note-pasted"]')
          ?.classList.contains('chain-note--new-flash')
      ).toBe(true);
    });
  });
});
