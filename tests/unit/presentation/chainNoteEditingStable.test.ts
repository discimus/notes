import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const tag = {
  id: 'tag-1',
  name: 'pesquisa',
  normalizedName: 'pesquisa',
  createdAt: '2026-01-01T10:00:00.000Z',
  origin: 'manual' as const,
  chainCount: 1,
};

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo da nota',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  tags: [tag],
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [note],
    noteTabs: [],
    activeNoteTabId: null,
    composerCollapsed: true,
    status: 'loaded',
    ...overrides,
  };
}

function makeHandlers() {
  return {
    initialEditorMode: 'none' as const,
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Estado estável da nota ao abrir o editor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
      allTags: [tag],
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('preserva a row de tags da nota ao abrir o editor', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const article = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-1"]'
    )!;
    const tagRow = article.querySelector<HTMLElement>('.chain-note__tags')!;
    const chip = tagRow.querySelector<HTMLElement>('.chip--selected')!;

    view.update(
      makeTab({
        noteTabs: [
          {
            id: 'note-tab-1',
            content: note.content,
            editingNoteId: note.id,
            baseContent: note.content,
          },
        ],
        activeNoteTabId: 'note-tab-1',
      })
    );

    expect(
      view.element.querySelector<HTMLElement>('[data-note-id="note-1"]')
    ).toBe(article);
    expect(article.querySelector('.chain-note__tags')).toBe(tagRow);
    expect(tagRow.querySelector('.chip--selected')).toBe(chip);
    expect(article.querySelector('.chain-note__editing')?.textContent).toBe(
      'Em edição'
    );
  });
});
