import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function note(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteúdo da nota',
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    ...overrides,
  };
}

const tab: ChainTab = {
  kind: 'chain',
  id: 'tab-chain',
  chainId: 'chain-1',
  title: 'Projeto',
  notes: [
    note(),
    note({
      id: 'note-code',
      content: 'const value = 1;',
      position: 1,
      role: 'tail',
      contentType: 'code',
    }),
  ],
  noteTabs: [{ id: 'note-tab-1', content: '' }],
  activeNoteTabId: 'note-tab-1',
  composerCollapsed: false,
  status: 'loaded',
};

describe('Chain note body surface', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
          noteCount: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
    });
  });

  it('coloca somente o texto dentro do body tonal', () => {
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onToggleComposer: vi.fn(),
    });

    const articles = [...view.element.querySelectorAll<HTMLElement>('.chain-note')];
    expect(articles).toHaveLength(2);

    for (const article of articles) {
      const body = article.querySelector<HTMLElement>('.chain-note__body');
      const text = body?.querySelector('.chain-note__text');
      const meta = article.querySelector<HTMLElement>('.chain-note__meta');
      expect(body).not.toBeNull();
      expect(text).not.toBeNull();
      expect(meta).not.toBeNull();
      expect(meta?.contains(text!)).toBe(false);
    }

    expect(
      articles[1]?.querySelector('.chain-note__body .chain-note__text--code')
        ?.textContent
    ).toBe('const value = 1;');
  });

  it('mantém a edição de código dentro do body', () => {
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onToggleComposer: vi.fn(),
    });

    const codeArticle = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-code"]'
    )!;
    codeArticle.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    expect(
      codeArticle.querySelector('.chain-note__body .chain-note__code-editor')
    ).not.toBeNull();
  });
});
