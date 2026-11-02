import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import type { ChainDocumentView } from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'TypeScript melhora a segurança.',
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

describe('sugestões de tags em notas no ChainDocument', () => {
  let view: ChainDocumentView | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [],
      allTags: [],
      tagSuggestionsByNoteId: {
        'note-1': [
          {
            noteId: 'note-1',
            name: 'typescript',
            normalizedName: 'typescript',
            score: 0.9,
            isNew: true,
            sources: ['yake', 'tfidf'],
          },
        ],
      },
    });
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    document.body.innerHTML = '';
    appState.set({ tagSuggestionsByNoteId: {} });
    vi.restoreAllMocks();
  });

  it('exibe a sugestão e aceita apenas por ação do usuário', async () => {
    const onAcceptNoteTagSuggestion = vi.fn().mockResolvedValue(true);
    const onAddNoteTag = vi.fn().mockResolvedValue(true);
    view = mountChainDocument(makeTab(), {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onEditNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onAddNoteTag,
      onRemoveNoteTag: vi.fn(),
      onAcceptNoteTagSuggestion,
      onDismissNoteTagSuggestion: vi.fn(),
    });

    expect(view.element.querySelector('.chip--suggestion')?.textContent).toContain(
      'typescript'
    );
    expect(onAddNoteTag).not.toHaveBeenCalled();

    view.element
      .querySelector<HTMLButtonElement>('[aria-label="Adicionar nova tag typescript"]')
      ?.click();

    await vi.waitFor(() => {
      expect(onAcceptNoteTagSuggestion).toHaveBeenCalledWith(
        'chain-1',
        'note-1',
        expect.objectContaining({ name: 'typescript' })
      );
    });
  });
});
