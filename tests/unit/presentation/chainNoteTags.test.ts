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

function makeTab(): ChainTab {
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

function makeHandlers() {
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

describe('Tags em notas no ChainDocument', () => {
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

  it('renderiza chips e remove uma tag da nota', () => {
    const handlers = makeHandlers();
    view = mountChainDocument(makeTab(), handlers);

    const tags = view.element.querySelector('.chain-note__tags');
    expect(tags?.textContent).toContain('pesquisa');

    view.element
      .querySelector<HTMLButtonElement>(
        '[aria-label="Remover tag pesquisa desta nota"]'
      )
      ?.click();

    expect(handlers.onRemoveNoteTag).toHaveBeenCalledWith('note-1', tag);
    expect(handlers.onEditNote).not.toHaveBeenCalled();
  });

  it('adiciona uma tag pela edição inline e mantém o campo para outra', async () => {
    const handlers = makeHandlers();
    view = mountChainDocument(makeTab(), handlers);

    view.element
      .querySelector<HTMLButtonElement>('.chain-note__tag-add')
      ?.click();

    const input = view.element.querySelector<HTMLInputElement>(
      '.chain-note__tags .tag-add__input'
    );
    expect(input).not.toBeNull();

    if (!input) return;
    input.value = 'nova';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    await vi.waitFor(() => {
      expect(handlers.onAddNoteTag).toHaveBeenCalledWith('note-1', 'nova');
      expect(input.value).toBe('');
      expect(input.disabled).toBe(false);
      expect(view?.element.contains(input)).toBe(true);
    });
  });
});
