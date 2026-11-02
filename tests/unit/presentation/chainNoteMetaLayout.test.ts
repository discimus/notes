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

describe('Cabeçalho compacto da nota', () => {
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

  it('mantém hora, tags e adicionar na mesma faixa de metadados', () => {
    view = mountChainDocument(makeTab(), makeHandlers());

    const article = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-1"]'
    );
    const meta = article?.querySelector<HTMLElement>('.chain-note__meta');
    const tags = article?.querySelector<HTMLElement>('.chain-note__tags');
    const add = article?.querySelector<HTMLButtonElement>(
      '.chain-note__tag-add'
    );

    expect(article?.querySelector('.chain-note__time')).not.toBeNull();
    expect(article?.querySelectorAll('.chain-note__tags')).toHaveLength(1);
    expect(tags?.parentElement).toBe(article);
    expect(tags?.previousElementSibling).toBe(meta);
    expect(tags?.contains(add ?? null)).toBe(true);
    expect(article?.querySelector('.chain-note__body')).not.toBeNull();
    expect(tags?.nextElementSibling?.classList.contains('chain-note__body')).toBe(
      true
    );
  });

  it('usa botão de tag somente com ícone e nome acessível', () => {
    view = mountChainDocument(makeTab(), makeHandlers());

    const add = view.element.querySelector<HTMLButtonElement>(
      '.chain-note__tag-add'
    );
    const chip = view.element.querySelector<HTMLElement>(
      '.chain-note__tags .chip--selected'
    );

    expect(add?.textContent).toContain('Nova tag');
    expect(add?.querySelectorAll('.material-symbols-rounded')).toHaveLength(1);
    expect(add?.getAttribute('aria-label')).toBe('Adicionar tag à nota');
    expect(add?.title).toBe('Adicionar tag');
    expect(add?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(chip?.title).toBe('pesquisa');
  });
});
