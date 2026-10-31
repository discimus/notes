import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import { AppController } from '@presentation/pages/AppController.js';

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

function makeTab(): ChainTab {
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
      onToggleComposer: vi.fn(),
    });

    const text = view.element.querySelector<HTMLElement>('.chain-note__text--code');
    expect(text?.textContent).toBe(code);
    expect(view.element.querySelector('.chain-note__format')?.textContent).toBe('Código');
  });

  it('edita código em textarea e permite cancelar com Escape', () => {
    const view = mountChainDocument(makeTab(), {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onToggleComposer: vi.fn(),
    });

    view.element.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();

    const editor = view.element.querySelector<HTMLTextAreaElement>(
      '.chain-note__code-editor'
    );
    expect(editor?.value).toBe(code);
    expect(editor?.spellcheck).toBe(false);

    editor?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(view.element.querySelector('.chain-note__code-editor')).toBeNull();
    expect(view.element.querySelector('.chain-note__text--code')?.textContent).toBe(code);
  });

  it('salva edição de código mantendo o tipo', async () => {
    const update = vi.spyOn(AppController, 'updateNoteContent').mockResolvedValue(undefined);
    const view = mountChainDocument(makeTab(), {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onToggleComposer: vi.fn(),
    });

    view.element.querySelector<HTMLButtonElement>('.chain-note__edit')?.click();
    const editor = view.element.querySelector<HTMLTextAreaElement>(
      '.chain-note__code-editor'
    )!;
    const next = '  const value = 2;\n  return value;';
    editor.value = next;
    editor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })
    );

    await vi.waitFor(() => {
      expect(update).toHaveBeenCalledWith('chain-1', 'note-code', next, 'code');
      expect(view.element.querySelector('.chain-note__code-editor')).toBeNull();
    });
  });
});
