import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { contentTypeOf, EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

let cleanup: (() => void) | null = null;

function makeChain(): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto principal',
    noteCount: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
  };
}

function makeNote(): NoteDTO {
  return {
    id: 'note-markdown',
    content: '# Nova nota',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    contentType: 'markdown',
    createdAt: '2026-01-02T11:00:00.000Z',
    updatedAt: '2026-01-02T11:00:00.000Z',
  };
}

function mount(store: EditorStore): HTMLElement {
  document.body.innerHTML = '<div id="editor-host"></div>';
  const host = document.getElementById('editor-host') as HTMLElement;
  cleanup = mountEditorView(host, store);
  return host;
}

describe('Document content type — Markdown', () => {
  beforeEach(() => {
    sessionStorage.clear();
    appState.set({
      view: 'editor',
      chainSummaries: [makeChain()],
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

  it('aplica modo verbatim no rascunho', () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea')!;

    host
      .querySelector<HTMLButtonElement>(
        '#draft-content-type .content-type-control__button'
      )
      ?.click();
    document
      .querySelector<HTMLElement>('[data-content-type="markdown"]')
      ?.click();

    expect(textarea.classList.contains('editor-textarea--verbatim')).toBe(true);
    expect(textarea.classList.contains('editor-textarea--code')).toBe(false);
    expect(textarea.spellcheck).toBe(false);
    expect(textarea.placeholder).toContain('Markdown');

    const active = store.getActiveTab();
    expect(active?.kind === 'draft' && contentTypeOf(active)).toBe('markdown');
  });

  it('salva rascunho Markdown com o tipo correto', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea')!;

    host
      .querySelector<HTMLButtonElement>(
        '#draft-content-type .content-type-control__button'
      )
      ?.click();
    document
      .querySelector<HTMLElement>('[data-content-type="markdown"]')
      ?.click();

    const note = makeNote();
    const save = vi.spyOn(AppController, 'saveEditorToChain').mockResolvedValue({
      ok: true,
      target: {
        chainId: 'chain-1',
        noteId: note.id,
        role: note.role,
        chainTitle: 'Projeto principal',
      },
      chainTitle: 'Projeto principal',
      note,
    });

    textarea.value = '# Título';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );

    document.querySelector<HTMLInputElement>('input[value="chain-1"]')?.click();
    document
      .querySelector<HTMLButtonElement>('[id^="append-chain-confirm-"]')
      ?.click();

    await vi.waitFor(() => {
      expect(save).toHaveBeenCalledWith('chain-1', '# Título', 'markdown');
    });
  });
});
