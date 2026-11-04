import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Nota recém-adicionada',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [note],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: true,
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
    onNewDocument: vi.fn(),
  };
}

describe('Realce de nota nova', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ chainSummaries: [] });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('aplica o flash na nota recém-adicionada', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());

    view.revealNote('note-1');

    const article = view.element.querySelector<HTMLElement>(
      '.chain-note[data-note-id="note-1"]'
    );
    expect(article?.classList.contains('chain-note--new-flash')).toBe(true);

    view.destroy();
  });
});
