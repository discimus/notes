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
    composer: '',
    savedComposer: '',
    status: 'loaded',
    ...overrides,
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

  it('renderiza histórico agrupado por data e compositor', () => {
    const view = mountChainDocument(makeTab(), {
      onComposerInput: vi.fn(),
      onAppend: vi.fn(),
    });

    expect(view.element.querySelector('.chain-document__title')?.textContent).toBe(
      'Projeto principal'
    );
    expect(view.element.querySelectorAll('.chain-date-group')).toHaveLength(1);
    expect(view.element.querySelector('.chain-note__text')?.textContent).toBe(
      'Conteúdo da nota'
    );
    expect(view.element.querySelector('#chain-note-count')?.textContent).toBe('1 nota');
    expect(view.element.querySelector('#chain-composer-input')).not.toBeNull();
    expect(view.element.querySelector('.chain-composer__label')?.textContent).toBe(
      'Novo documento'
    );
    expect(view.element.querySelector('.chain-composer__icon')?.textContent).toBe(
      'edit_note'
    );
    expect(view.element.querySelector('#chain-composer-save-label')?.textContent).toBe(
      'Adicionar'
    );
  });

  it('encaminha digitação e adição no compositor', () => {
    const onComposerInput = vi.fn();
    const onAppend = vi.fn();
    const view = mountChainDocument(makeTab(), {
      onComposerInput,
      onAppend,
    });

    const composer = view.element.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    if (!composer) throw new Error('Compositor não encontrado');

    composer.value = 'Nova nota';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onComposerInput).toHaveBeenCalledWith('Nova nota');

    view.element.querySelector<HTMLButtonElement>('#chain-composer-save')?.click();
    expect(onAppend).toHaveBeenCalled();
  });

  it('limpa o compositor apenas quando o conteúdo salvo ainda está presente', () => {
    const onComposerInput = vi.fn();
    const view = mountChainDocument(makeTab({ composer: 'Salvo' }), {
      onComposerInput,
      onAppend: vi.fn(),
    });

    const composer = view.element.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    if (!composer) throw new Error('Compositor não encontrado');
    expect(composer.value).toBe('Salvo');

    view.clearComposerIf('Outro texto');
    expect(composer.value).toBe('Salvo');

    view.clearComposerIf('Salvo');
    expect(composer.value).toBe('');
    expect(onComposerInput).toHaveBeenCalledWith('');
  });

  it('desabilita o compositor durante o salvamento', () => {
    const view = mountChainDocument(makeTab(), {
      onComposerInput: vi.fn(),
      onAppend: vi.fn(),
    });

    view.setSaving(true);
    expect(
      view.element.querySelector<HTMLButtonElement>('#chain-composer-save')?.disabled
    ).toBe(true);
    expect(
      view.element.querySelector<HTMLTextAreaElement>('#chain-composer-input')?.disabled
    ).toBe(true);
  });
});
