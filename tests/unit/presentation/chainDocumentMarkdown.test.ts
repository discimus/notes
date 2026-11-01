import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const markdownContent = '# Título\n\n[link](https://example.com)\n\n**forte**\n';

function makeTab(): ChainTab {
  const note: NoteDTO = {
    id: 'markdown-note',
    content: markdownContent,
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    contentType: 'markdown',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };

  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [note],
    noteTabs: [{ id: 'note-tab-1', content: markdownContent, contentType: 'markdown' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
  };
}

function makeHandlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('ChainDocument — Markdown bruto', () => {
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
          tagIds: [],
          tags: [],
          headerExcerpt: '',
        },
      ],
    });
  });

  it('exibe Markdown como texto verbatim, sem linkificação', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());

    const text = view.element.querySelector<HTMLElement>(
      '.chain-note__text--markdown'
    );
    expect(text).not.toBeNull();
    expect(text?.querySelector('h1')?.textContent).toBe('Título');
    expect(text?.querySelector('strong')?.textContent).toBe('forte');
    expect(text?.querySelector('a')?.getAttribute('href')).toBe(
      'https://example.com'
    );
    expect(text?.querySelector('a')?.getAttribute('target')).toBe('_blank');
    expect(text?.querySelector('a')?.getAttribute('rel')).toBe(
      'noopener noreferrer'
    );
    expect(text?.classList.contains('chain-note__text--code')).toBe(false);
    expect(text?.classList.contains('chain-note__text--verbatim')).toBe(false);
    expect(view.element.querySelector('.chain-note__format')?.textContent).toBe(
      'Markdown'
    );
    expect(
      view.element.querySelector('.chain-note__body--markdown')
    ).not.toBeNull();

    const composer = view.element.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    )!;
    expect(composer.classList.contains('chain-composer__input--verbatim')).toBe(
      true
    );
    expect(composer.classList.contains('chain-composer__input--code')).toBe(
      false
    );
    expect(composer.spellcheck).toBe(false);
    expect(composer.placeholder).toBe('Escreva uma nota em Markdown...');
    expect(
      view.element.querySelector('#chain-content-type .content-type-control__label')
        ?.textContent
    ).toBe('Markdown');

    view.destroy();
  });
});
