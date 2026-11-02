import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO, TagDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import type { ChainDocumentView } from '@presentation/components/ChainDocument.js';

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
  content: 'Conteúdo da nota',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  tags: [tag],
};

function tab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [note],
    noteTabs: [{ id: 'note-tab-1', content: 'Rascunho', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
  };
}

function handlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onAddNoteTag: vi.fn().mockResolvedValue(true),
    onRemoveNoteTag: vi.fn(),
  };
}

describe('remoção de tag com botão do scroll', () => {
  let view: ChainDocumentView | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ chainSummaries: [], allTags: [tag] });
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('remove a tag ao pressionar o botão do meio sobre o chip', () => {
    const callbacks = handlers();
    view = mountChainDocument(tab(), callbacks);
    const chip = view.element.querySelector<HTMLElement>(
      '.chain-note__tags .chip--selected'
    )!;

    const mousedown = new MouseEvent('mousedown', {
      button: 1,
      bubbles: true,
      cancelable: true,
    });
    chip.dispatchEvent(mousedown);
    expect(mousedown.defaultPrevented).toBe(true);

    const auxclick = new MouseEvent('auxclick', {
      button: 1,
      bubbles: true,
      cancelable: true,
    });
    chip.dispatchEvent(auxclick);

    expect(auxclick.defaultPrevented).toBe(true);
    expect(callbacks.onRemoveNoteTag).toHaveBeenCalledWith('note-1', tag);
  });

  it('ignora o botão esquerdo no auxclick', () => {
    const callbacks = handlers();
    view = mountChainDocument(tab(), callbacks);
    const chip = view.element.querySelector<HTMLElement>(
      '.chain-note__tags .chip--selected'
    )!;

    chip.dispatchEvent(
      new MouseEvent('auxclick', {
        button: 0,
        bubbles: true,
        cancelable: true,
      })
    );

    expect(callbacks.onRemoveNoteTag).not.toHaveBeenCalled();
  });
});
