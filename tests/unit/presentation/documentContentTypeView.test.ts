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
    id: 'note-2',
    content: 'Nova nota',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    contentType: 'code',
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

function selectCode(host: HTMLElement, selector: string): void {
  host.querySelector<HTMLButtonElement>(selector)?.click();
  document.querySelector<HTMLElement>('[data-content-type="code"]')?.click();
}

describe('Document content type', () => {
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

  it('aplica modo código no rascunho e no editor', () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea')!;

    expect(textarea.spellcheck).toBe(true);
    selectCode(host, '#draft-content-type .content-type-control__button');

    expect(textarea.classList.contains('editor-textarea--code')).toBe(true);
    expect(textarea.spellcheck).toBe(false);
    expect(textarea.placeholder).toContain('código');

    const active = store.getActiveTab();
    expect(active?.kind === 'draft' && contentTypeOf(active)).toBe('code');
  });

  it('alterna o tipo do rascunho com scroll no seletor', () => {
    const store = new EditorStore();
    const host = mount(store);
    const button = host.querySelector<HTMLButtonElement>(
      '#draft-content-type .content-type-control__button'
    )!;
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea')!;

    button.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })
    );

    expect(textarea.classList.contains('editor-textarea--code')).toBe(true);
    expect(document.querySelector('[role="menu"]')).toBeNull();
    const active = store.getActiveTab();
    expect(active?.kind === 'draft' && contentTypeOf(active)).toBe('code');
  });

  it('salva rascunho de código com o tipo correto', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const textarea = host.querySelector<HTMLTextAreaElement>('#draft-textarea')!;
    selectCode(host, '#draft-content-type .content-type-control__button');

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

    textarea.value = '  return 42;';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );

    document.querySelector<HTMLInputElement>('input[value="chain-1"]')?.click();
    document
      .querySelector<HTMLButtonElement>('[id^="append-chain-confirm-"]')
      ?.click();

    await vi.waitFor(() => {
      expect(save).toHaveBeenCalledWith('chain-1', '  return 42;', 'code');
    });
  });

  it('envia texto ou código ao atualizar rascunho vinculado', async () => {
    const store = new EditorStore();
    mount(store);
    const draft = store.getActiveTab();
    if (!draft || draft.kind !== 'draft') throw new Error('Rascunho não encontrado');

    store.updateDraftContent(draft.id, 'const value = 1;');
    store.updateDraftContentType(draft.id, 'code');
    store.markDraftSaved(
      draft.id,
      { chainId: 'chain-1', noteId: 'note-2', role: 'tail', chainTitle: 'Projeto' },
      'anterior'
    );

    const note = makeNote();
    const update = vi.spyOn(AppController, 'updateEditorNote').mockResolvedValue({
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

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );
    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ noteId: 'note-2' }),
        'const value = 1;',
        'code'
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    store.updateDraftContentType(draft.id, 'text');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );
    await vi.waitFor(() => {
      expect(update).toHaveBeenLastCalledWith(
        expect.objectContaining({ noteId: 'note-2' }),
        'const value = 1;',
        'text'
      );
    });
  });

  it('salva nota da coleção como código', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const chain = store.openChainTab('chain-1', 'Projeto principal');

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input')!;
    selectCode(host, '#chain-content-type .content-type-control__button');
    expect(composer.classList.contains('chain-composer__input--code')).toBe(true);
    expect(composer.spellcheck).toBe(false);
    expect(
      host.querySelector('#chain-note-tabs .editor-tab__icon')?.textContent
    ).toBe('code');

    const note = makeNote();
    const append = vi.spyOn(AppController, 'appendToEditorChainTab').mockResolvedValue({
      ok: true,
      note,
      chainTitle: 'Projeto principal',
    });

    composer.value = 'const value = 1;';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );

    await vi.waitFor(() => {
      const active = store.getTab(chain.id);
      expect(active?.kind === 'chain' && active.notes.length).toBe(1);
    });

    expect(append).toHaveBeenCalledWith('chain-1', 'const value = 1;', 'code');
  });
});
