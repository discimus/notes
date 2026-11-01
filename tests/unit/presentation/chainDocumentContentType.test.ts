import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const code = '  const value = 1;\n  return value;';

function makeNote(): NoteDTO {
  return {
    id: 'note-code',
    content: code,
    chainId: 'chain-1',
    position: 0,
    role: 'header',
    contentType: 'code',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  };
}

function makeTab(overrides: Partial<ChainTab> = {}): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [makeNote()],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
    ...overrides,
  };
}

describe('ChainDocument content type', () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renderiza código com monospace e badge', () => {
    const view = mountChainDocument(makeTab(), {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
    });

    const text = view.element.querySelector<HTMLElement>('.chain-note__text--code');
    expect(text?.textContent).toBe(code);
    expect(view.element.querySelector('.chain-note__format')?.textContent).toBe('Código');
  });

  it('encaminha a edição de código para o compositor', () => {
    const onEditNote = vi.fn();
    const view = mountChainDocument(makeTab(), {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onEditNote,
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
    });

    view.element.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    expect(onEditNote).toHaveBeenCalledWith('note-code');
    expect(view.element.querySelector('.chain-note__code-editor')).toBeNull();
  });

  it('exibe a nota de código em edição no compositor', () => {
    const onSaveNote = vi.fn();
    const view = mountChainDocument(
      makeTab({
        noteTabs: [
          {
            id: 'edit-tab',
            content: code,
            contentType: 'code',
            editingNoteId: 'note-code',
            baseContent: code,
            baseContentType: 'code',
          },
        ],
        activeNoteTabId: 'edit-tab',
        composerCollapsed: false,
      }),
      {
        onNoteInput: vi.fn(),
        onSaveNote,
        onCreateNote: vi.fn(),
        onSelectNote: vi.fn(),
        onCloseNote: vi.fn(),
      }
    );

    const composer = view.element.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    const save = view.element.querySelector<HTMLButtonElement>('#chain-composer-save');
    const label = view.element.querySelector('#chain-composer-save-label');
    const status = view.element.querySelector('#chain-composer-status');

    expect(composer?.value).toBe(code);
    expect(composer?.classList.contains('chain-composer__input--code')).toBe(true);
    expect(label?.textContent).toBe('Salvar');
    expect(status?.textContent).toBe('Editando nota');
    expect(view.element.querySelector('.editor-tab--editing')).not.toBeNull();

    save?.click();
    expect(onSaveNote).toHaveBeenCalledWith('edit-tab');
  });
});
