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
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeChainDetail(note: NoteDTO): ChainDetailDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto principal',
    noteCount: 1,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: note.updatedAt,
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes: [note],
  };
}

describe('Editor edit note in composer', () => {
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

  function mountWithNote(note: NoteDTO) {
    const store = new EditorStore();
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, store);

    const chain = store.openChainTab('chain-1', 'Projeto principal', {
      composerCollapsed: true,
    });
    store.setChainTabNotes(chain.id, makeChainDetail(note));

    return { store, host, chainId: chain.id };
  }

  it('edita uma nota de texto no compositor e atualiza ao salvar', async () => {
    const note = makeNote();
    const { store, host, chainId } = mountWithNote(note);
    const update = vi
      .spyOn(AppController, 'updateNoteContent')
      .mockResolvedValue(true);

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    const chainWithEdit = store.getTab(chainId);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('Coleção não encontrada');
    const editTab = chainWithEdit.noteTabs.find((tab) => tab.editingNoteId === note.id);
    expect(editTab).toBeDefined();

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    const saveLabel = host.querySelector<HTMLElement>('#chain-composer-save-label');
    const status = host.querySelector<HTMLElement>('#chain-composer-status');

    expect(composer?.value).toBe(note.content);
    expect(saveLabel?.textContent).toBe('Salvar');
    expect(status?.textContent).toBe('Editando nota');
    expect(host.querySelector('.editor-tab--editing')).not.toBeNull();

    if (!composer) throw new Error('Compositor não encontrado');
    composer.value = 'Conteúdo atualizado';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('#chain-composer-save')?.click();

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        'chain-1',
        note.id,
        'Conteúdo atualizado',
        'text'
      );
      const after = store.getTab(chainId);
      if (!after || after.kind !== 'chain') throw new Error('Coleção não encontrada');
      expect(after.noteTabs.some((tab) => tab.editingNoteId === note.id)).toBe(false);
    });

    const afterSave = store.getTab(chainId);
    if (!afterSave || afterSave.kind !== 'chain') throw new Error('Coleção não encontrada');
    expect(afterSave.noteTabs.some((tab) => !tab.editingNoteId && !tab.content)).toBe(true);
    expect(saveLabel?.textContent).toBe('Adicionar');
  });

  it('edita uma nota de código mantendo o tipo no compositor', async () => {
    const note = makeNote({ contentType: 'code', content: 'const value = 1;' });
    const { store, host, chainId } = mountWithNote(note);
    const update = vi
      .spyOn(AppController, 'updateNoteContent')
      .mockResolvedValue(true);

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    const chainWithEdit = store.getTab(chainId);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('Coleção não encontrada');
    const editTab = chainWithEdit.noteTabs.find((tab) => tab.editingNoteId === note.id);
    expect(editTab?.contentType).toBe('code');

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    expect(composer?.value).toBe(note.content);
    expect(composer?.classList.contains('chain-composer__input--code')).toBe(true);
    expect(composer?.placeholder).toBe('Edite o trecho de código...');

    if (!composer) throw new Error('Compositor não encontrado');
    composer.value = 'const value = 2;';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('#chain-composer-save')?.click();

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('chain-1', note.id, 'const value = 2;', 'code');
    });
  });

  it('confirma o descarte ao fechar uma aba de edição dirty', async () => {
    const note = makeNote();
    const { store, host, chainId } = mountWithNote(note);
    vi.spyOn(AppController, 'updateNoteContent').mockResolvedValue(true);

    host.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    const chainWithEdit = store.getTab(chainId);
    if (!chainWithEdit || chainWithEdit.kind !== 'chain') throw new Error('Coleção não encontrada');
    const editTab = chainWithEdit.noteTabs.find((tab) => tab.editingNoteId === note.id);
    if (!editTab) throw new Error('Aba de edição não encontrada');

    const composer = host.querySelector<HTMLTextAreaElement>('#chain-composer-input');
    if (!composer) throw new Error('Compositor não encontrado');
    composer.value = 'Alteração não salva';
    composer.dispatchEvent(new Event('input', { bubbles: true }));

    host
      .querySelector<HTMLButtonElement>(
        `#chain-note-tabs [data-tab-id="${editTab.id}"] .editor-tab__close`
      )
      ?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    });

    document
      .querySelector<HTMLButtonElement>('[id^="close-tab-discard-"]')
      ?.click();

    await vi.waitFor(() => {
      const afterDiscard = store.getTab(chainId);
      if (!afterDiscard || afterDiscard.kind !== 'chain') throw new Error('Coleção não encontrada');
      expect(
        afterDiscard.noteTabs.some((tab) => tab.editingNoteId === note.id)
      ).toBe(false);
    });
  });
});
