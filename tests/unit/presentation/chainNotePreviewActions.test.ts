import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const first: NoteDTO = {
  id: 'note-1',
  content: 'Primeira nota',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  tags: [
    {
      id: 'tag-1',
      name: 'pesquisa',
      normalizedName: 'pesquisa',
      createdAt: '2026-01-01T10:00:00.000Z',
      origin: 'manual',
      chainCount: 1,
    },
  ],
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const second: NoteDTO = {
  ...first,
  id: 'note-2',
  content: 'Segunda nota',
  position: 1,
  role: 'tail',
  tags: [],
};

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [first, second],
    noteTabs: [],
    activeNoteTabId: null,
    composerCollapsed: true,
    status: 'loaded',
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

describe('Ações de prévia e edição da nota', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
          noteCount: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
      allTags: [],
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('mostra as ações de visualizar e editar ao interagir com a nota', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const article = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-1"]'
    );
    const preview = article?.querySelector<HTMLButtonElement>('.chain-note__preview');
    const edit = article?.querySelector<HTMLButtonElement>('.chain-note__edit');

    expect(preview?.getAttribute('aria-label')).toBe('Visualizar nota');
    expect(preview?.title).toBe('Visualizar nota');
    expect(edit?.getAttribute('aria-label')).toBe('Editar nota');
  });

  it('carrega o preview da timeline ao clicar em visualizar', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const previewHost = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    )!;

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__preview'
      )
      ?.click();

    expect(previewHost.hidden).toBe(false);
    expect(previewHost.classList.contains('timeline-preview')).toBe(true);
    expect(previewHost.querySelector('.timeline-preview__title')?.textContent).toBe(
      'Projeto principal'
    );
    expect(previewHost.querySelector('.timeline-preview__text')?.textContent).toBe(
      'Primeira nota'
    );
    expect(previewHost.querySelector('.timeline-preview__tags')?.textContent).toBe(
      'pesquisa'
    );
    expect(
      view.element
        .querySelector('[data-note-id="note-1"]')
        ?.classList.contains('chain-note--previewing')
    ).toBe(true);
    expect(view.element.classList.contains('chain-document--preview-open')).toBe(
      true
    );
  });

  it('fecha o preview e abre o editor pela ação de editar', () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const previewHost = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    )!;

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__preview'
      )
      ?.click();
    previewHost
      .querySelector<HTMLButtonElement>('.timeline-preview__actions .btn')
      ?.click();

    expect(previewHost.hidden).toBe(true);
    expect(view.element.classList.contains('chain-document--preview-open')).toBe(
      false
    );
    expect(handlers.onEditNote).toHaveBeenCalledWith('note-1');
  });

  it('usa o corpo da nota como área de prévia e o botão como área de edição', () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const previewHost = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    )!;

    view.element
      .querySelector<HTMLElement>('[data-note-id="note-2"] .chain-note__body')
      ?.click();

    expect(previewHost.hidden).toBe(false);
    expect(previewHost.textContent).toContain('Segunda nota');
    expect(handlers.onEditNote).not.toHaveBeenCalled();

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-2"] .chain-note__edit'
      )
      ?.click();

    expect(handlers.onEditNote).toHaveBeenCalledWith('note-2');
  });

  it('não usa duplo clique no corpo nem no preview para abrir o editor', () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const body = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-1"] .chain-note__body'
    )!;
    const previewHost = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    )!;

    body.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true })
    );
    expect(handlers.onEditNote).not.toHaveBeenCalled();

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__preview'
      )
      ?.click();
    previewHost.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true })
    );

    expect(handlers.onEditNote).not.toHaveBeenCalled();
    expect(previewHost.hidden).toBe(false);
  });

  it('fecha o preview pelo botão de fechar', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const previewHost = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    )!;

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__preview'
      )
      ?.click();
    previewHost
      .querySelector<HTMLButtonElement>('.timeline-preview__close')
      ?.click();

    expect(previewHost.hidden).toBe(true);
    expect(view.element.classList.contains('chain-document--preview-open')).toBe(
      false
    );
  });

  it('fecha o preview ao clicar fora dele', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const previewHost = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    )!;

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__preview'
      )
      ?.click();
    view.element
      .querySelector<HTMLElement>('[data-note-id="note-2"] .chain-note__time')
      ?.click();

    expect(previewHost.hidden).toBe(true);
    expect(view.element.classList.contains('chain-document--preview-open')).toBe(
      false
    );
  });

  it('fecha o preview com Escape', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const previewHost = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    )!;

    view.element
      .querySelector<HTMLButtonElement>(
        '[data-note-id="note-1"] .chain-note__preview'
      )
      ?.click();
    previewHost.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
    );

    expect(previewHost.hidden).toBe(true);
    expect(view.element.classList.contains('chain-document--preview-open')).toBe(
      false
    );
  });
});
