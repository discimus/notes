import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [],
    noteTabs: [{ id: 'note-tab-1', content: 'Nova nota' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
  };
}

describe('ChainDocument Ctrl+Enter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ chainSummaries: [] });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('salva a nota solicitando também o fechamento do editor', () => {
    const onSaveNote = vi.fn();
    const view = mountChainDocument(makeTab(), {
      onNoteInput: vi.fn(),
      onSaveNote,
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
    });

    const composer = view.element.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    );
    if (!composer) throw new Error('Compositor não encontrado.');

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    composer.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onSaveNote).toHaveBeenCalledWith('note-tab-1', { closeEditor: true });
  });
});
