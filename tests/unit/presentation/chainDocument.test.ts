import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
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

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [makeNote()],
    noteTabs: [{ id: 'note-tab-1', content: '' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onToggleComposer: vi.fn(),
  };
}

describe('ChainDocument', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
          noteCount: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          isFavorite: false,
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
    });
  });

  it('renderiza histórico agrupado por data e aba inicial de novo documento', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());

    expect(view.element.querySelector('.chain-document__title')?.textContent).toBe(
      'Projeto principal'
    );
    expect(view.element.querySelectorAll('.chain-date-group')).toHaveLength(1);
    expect(view.element.querySelector('.chain-note__text')?.textContent).toBe(
      'Conteúdo da nota'
    );
    expect(view.element.querySelector('#chain-note-count')?.textContent).toBe('1 nota');
    expect(view.element.querySelector('#chain-composer-input')).not.toBeNull();
    expect(view.element.querySelector('.active-line-highlight')).not.toBeNull();
    expect(view.element.querySelectorAll('#chain-note-tabs [role="tab"]')).toHaveLength(1);
    expect(view.element.querySelector('.editor-tab__label')?.textContent).toBe(
      'Novo documento'
    );
    expect(view.element.querySelector('.editor-tab__icon')?.textContent).toBe(
      'edit_note'
    );
    expect(view.element.querySelector('#chain-composer-save-label')?.textContent).toBe(
      'Adicionar'
    );
  });

  it('recolhe e expande a área de notas com estado acessível', () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(
      makeTab({
        composerCollapsed: true,
        noteTabs: [{ id: 'note-tab-1', content: 'Rascunho' }],
      }),
      handlers
    );

    const toggle = view.element.querySelector<HTMLButtonElement>(
      '#chain-composer-toggle'
    );
    const body = view.element.querySelector<HTMLElement>('#chain-composer-body');

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-controls')).toBe('chain-composer-body');
    expect(body?.hidden).toBe(true);
    expect(view.element.classList.contains('chain-document--notes-collapsed')).toBe(
      true
    );
    expect(
      view.element.querySelector<HTMLElement>('#chain-composer-count')?.textContent
    ).toBe('1');
    expect(
      view.element.querySelector<HTMLElement>('#chain-composer-dirty')?.hidden
    ).toBe(false);

    toggle?.click();
    expect(handlers.onToggleComposer).toHaveBeenCalled();
  });

  it('encaminha digitação, adição e criação de nova aba', () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);

    const composer = view.element.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    if (!composer) throw new Error('Compositor não encontrado');

    composer.value = 'Nova nota';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    expect(handlers.onNoteInput).toHaveBeenCalledWith('note-tab-1', 'Nova nota');

    view.element.querySelector<HTMLButtonElement>('#chain-composer-save')?.click();
    expect(handlers.onSaveNote).toHaveBeenCalledWith('note-tab-1');

    view.element.querySelector<HTMLButtonElement>('#chain-note-new')?.click();
    expect(handlers.onCreateNote).toHaveBeenCalled();
  });

  it('cria nova nota com duplo clique no espaço vazio das abas', () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const tabs = view.element.querySelector('#chain-note-tabs');

    tabs?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(handlers.onCreateNote).toHaveBeenCalledTimes(1);

    view.element
      .querySelector('#chain-note-tabs [role="tab"]')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(handlers.onCreateNote).toHaveBeenCalledTimes(1);
  });

  it('exibe múltiplas abas e o conteúdo da aba ativa', () => {
    const view = mountChainDocument(
      makeTab({
        noteTabs: [
          { id: 'note-tab-1', content: 'Primeira nota' },
          { id: 'note-tab-2', content: 'Segunda nota' },
        ],
        activeNoteTabId: 'note-tab-2',
      }),
      makeHandlers()
    );

    const tabs = view.element.querySelectorAll('#chain-note-tabs [role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(
      view.element.querySelector<HTMLTextAreaElement>('#chain-composer-input')?.value
    ).toBe('Segunda nota');
    expect(view.element.querySelectorAll('.editor-tab--dirty')).toHaveLength(2);
  });

  it('desabilita a edição durante o salvamento', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());

    view.setSaving(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-composer-save')?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLTextAreaElement>('#chain-composer-input')?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-note-new')?.disabled
    ).toBe(true);
  });
});
