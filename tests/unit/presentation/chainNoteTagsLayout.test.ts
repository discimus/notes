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
  contentType: 'text',
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

describe('layout das tags da nota', () => {
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

  it('renderiza as tags em uma row separada abaixo dos metadados', () => {
    view = mountChainDocument(tab(), handlers());

    const meta = view.element.querySelector('.chain-note__meta');
    const tags = view.element.querySelector('.chain-note__tags');

    expect(tags).not.toBeNull();
    expect(tags?.closest('.chain-note__meta')).toBeNull();
    expect(meta?.nextElementSibling).toBe(tags);
    expect(tags?.nextElementSibling?.classList.contains('chain-note__body')).toBe(
      true
    );

    const control = tags?.querySelector('.tag-editor__control');
    const chips = tags?.querySelector('.tag-editor__chips');
    expect(chips?.nextElementSibling).toBe(control);
    expect(control?.querySelector('.chain-note__tag-add')?.textContent).toContain(
      'Nova tag'
    );
  });
});
