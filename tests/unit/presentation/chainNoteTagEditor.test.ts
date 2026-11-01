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

describe('Editor inline de tags da nota', () => {
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

  it('ocupa a linha de tags e mantém a edição após cadastrar', async () => {
    const handlers = makeHandlers();
    view = mountChainDocument(makeTab(), handlers);

    const tagsHost = view.element.querySelector<HTMLElement>('.chain-note__tags');
    view.element
      .querySelector<HTMLButtonElement>('.chain-note__tag-add')
      ?.click();

    const input = tagsHost?.querySelector<HTMLInputElement>('.tag-add__input');
    expect(input).not.toBeNull();
    if (!input) return;

    input.value = 'pes';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const option = document.querySelector<HTMLElement>(
      '.tag-suggestions [role="option"]'
    );
    expect(option?.textContent).toContain('pesquisa');

    option?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      expect(handlers.onAddNoteTag).toHaveBeenCalledWith('note-1', 'pesquisa');
      expect(tagsHost?.querySelector('.tag-add__input')).toBe(input);
      expect(input.value).toBe('');
      expect(input.disabled).toBe(false);
    });
  });
});
