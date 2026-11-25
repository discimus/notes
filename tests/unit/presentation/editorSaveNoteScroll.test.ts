import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { AppController } from '@presentation/pages/AppController.js';

let cleanup: (() => void) | null = null;

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteúdo original',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeChainDetail(notes: NoteDTO[]): ChainDetailDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto principal',
    noteCount: notes.length,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: notes[notes.length - 1]?.updatedAt ?? '2026-01-01T10:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes,
  };
}

function rect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

describe('Scroll para nota editada após salvar', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="editor-host"></div>';
    appState.set({
      view: 'editor',
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
          noteCount: 1,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
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

  function mountWithNotes(notes: NoteDTO[]) {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(chain.id, makeChainDetail(notes));

    return { store, host, chainId: chain.id };
  }

  it('aplica flash e rola até a nota editada após salvar', async () => {
    const notes = [
      makeNote({ id: 'note-1', position: 1, content: 'Primeira' }),
      makeNote({ id: 'note-2', position: 2, content: 'Nota alvo' }),
      makeNote({ id: 'note-3', position: 3, content: 'Terceira' }),
    ];
    const { store, host, chainId } = mountWithNotes(notes);
    vi.spyOn(AppController, 'updateNoteContent').mockResolvedValue(true);

    const editButtons = host.querySelectorAll<HTMLButtonElement>('.chain-note__edit');
    editButtons[1]?.click();

    const chainWithEdit = store.getTab(chainId);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('missing');
    const editTab = chainWithEdit.noteTabs.find((tab) => tab.editingNoteId === 'note-2');
    expect(editTab).toBeDefined();

    const scroll = host.querySelector<HTMLElement>('#chain-document-scroll')!;
    const target = host.querySelector<HTMLElement>('.chain-note[data-note-id="note-2"]')!;
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 2000 });
    scroll.scrollTop = 1400;
    const scrollToSpy = vi.fn((options?: ScrollToOptions | number) => {
      if (typeof options === 'object' && options?.top !== undefined) {
        scroll.scrollTop = options.top;
      }
    });
    scroll.scrollTo = scrollToSpy as unknown as HTMLElement['scrollTo'];
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(rect(0, 400));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(-800, 100));

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    if (!composer) throw new Error('missing composer');
    composer.value = 'Conteúdo atualizado';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('#chain-composer-save')?.click();

    await vi.waitFor(() => {
      expect(AppController.updateNoteContent).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      const article = host.querySelector<HTMLElement>(
        '.chain-note[data-note-id="note-2"]'
      );
      expect(article?.classList.contains('chain-note--new-flash')).toBe(true);
      expect(scrollToSpy).toHaveBeenCalled();
      expect(scroll.scrollTop).toBe(584);
    });
  });

  it('aplica flash na nota editada ao salvar sem fechar (Ctrl+S)', async () => {
    const note = makeNote();
    const { store, host, chainId } = mountWithNotes([note]);
    vi.spyOn(AppController, 'updateNoteContent').mockResolvedValue(true);

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    const chainWithEdit = store.getTab(chainId);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('missing');
    const editTab = chainWithEdit.noteTabs.find((tab) => tab.editingNoteId === note.id);
    if (!editTab) throw new Error('missing edit tab');

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    if (!composer) throw new Error('missing composer');
    composer.value = 'Atualização via Ctrl+S';
    composer.dispatchEvent(new Event('input', { bubbles: true }));

    const editorRoot = host.querySelector<HTMLElement>('#editor-panel');
    if (!editorRoot) throw new Error('missing editor panel');
    editorRoot.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      })
    );

    await vi.waitFor(() => {
      expect(AppController.updateNoteContent).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      const afterSave = store.getTab(chainId);
      if (!afterSave || afterSave.kind !== 'chain') throw new Error('missing');
      expect(afterSave.noteTabs.some((tab) => tab.editingNoteId === note.id)).toBe(true);
    });

    await vi.waitFor(() => {
      const article = host.querySelector<HTMLElement>(
        `.chain-note[data-note-id="${note.id}"]`
      );
      expect(article?.classList.contains('chain-note--new-flash')).toBe(true);
    });
  });

  it('reposiciona o scroll após transição de flex-basis ao fechar o compositor (Ctrl+Enter)', async () => {
    const notes = [
      makeNote({ id: 'note-1', position: 1, content: 'Primeira' }),
      makeNote({ id: 'note-2', position: 2, content: 'Nota alvo' }),
      makeNote({ id: 'note-3', position: 3, content: 'Terceira' }),
    ];
    const { host } = mountWithNotes(notes);
    vi.spyOn(AppController, 'updateNoteContent').mockResolvedValue(true);

    const editButtons = host.querySelectorAll<HTMLButtonElement>('.chain-note__edit');
    editButtons[1]?.click();

    const scroll = host.querySelector<HTMLElement>('#chain-document-scroll')!;
    const target = host.querySelector<HTMLElement>('.chain-note[data-note-id="note-2"]')!;
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 2000 });
    scroll.scrollTop = 1400;
    const scrollToSpy = vi.fn((options?: ScrollToOptions | number) => {
      if (typeof options === 'object' && options?.top !== undefined) {
        scroll.scrollTop = options.top;
      }
    });
    scroll.scrollTo = scrollToSpy as unknown as HTMLElement['scrollTo'];
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(rect(0, 400));
    const targetRectSpy = vi
      .spyOn(target, 'getBoundingClientRect')
      .mockReturnValue(rect(-800, 100));

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    if (!composer) throw new Error('missing composer');
    composer.value = 'Salvo com Ctrl+Enter';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
      })
    );

    await vi.waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledTimes(1);
    });

    // Simula deslocamento da nota durante a transição de flex-basis ao recolher o compositor
    targetRectSpy.mockReturnValue(rect(-300, 100));
    const transitionEvent = new Event('transitionend', { bubbles: false });
    Object.defineProperty(transitionEvent, 'propertyName', { value: 'flex-basis' });
    scroll.dispatchEvent(transitionEvent);

    expect(scrollToSpy).toHaveBeenCalledTimes(2);
    expect(scroll.scrollTop).toBe(268);
  });
});
