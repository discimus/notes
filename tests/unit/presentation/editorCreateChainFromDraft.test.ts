import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

let cleanup: (() => void) | null = null;

const note: NoteDTO = {
  id: 'note-new',
  content: 'Conteúdo do rascunho',
  chainId: 'chain-new',
  position: 1,
  role: 'tail',
  contentType: 'text',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

describe('Editor cria cadeia a partir do rascunho', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [],
      chainFilterQuery: '',
      isLoading: false,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('cria e salva a nova cadeia pelo título digitado no diálogo', async () => {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const create = vi.spyOn(AppController, 'createChainWithNote').mockResolvedValue({
      ok: true,
      target: {
        chainId: 'chain-new',
        noteId: note.id,
        role: 'tail',
        chainTitle: 'Cadeia nova',
      },
      chainTitle: 'Cadeia nova',
      note,
    });

    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea')!;
    textarea.value = 'Conteúdo do rascunho';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );

    const search = document.querySelector<HTMLInputElement>(
      '[id^="append-chain-search-"]'
    )!;
    search.value = 'Cadeia nova';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    await vi.waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        'Cadeia nova',
        'Conteúdo do rascunho',
        'text'
      );
    });

    const active = store.getActiveTab();
    expect(active?.kind === 'draft' && active.target?.chainId).toBe('chain-new');
    expect(active?.kind === 'draft' && active.target?.noteId).toBe(note.id);
  });
});
