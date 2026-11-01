import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';
import type { ChainDocumentView } from '@presentation/components/ChainDocument.js';

function makeTab(composerCollapsed: boolean): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [
      {
        id: 'note-1',
        content: 'Conteúdo da nota',
        chainId: 'chain-1',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
      },
    ],
    noteTabs: [{ id: 'note-tab-1', content: '', contentType: 'text' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed,
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
  };
}

describe('Layout do compositor da cadeia', () => {
  let view: ChainDocumentView | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ chainSummaries: [], allTags: [] });
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('alterna o estado que centraliza a lista e abre o painel do editor', () => {
    view = mountChainDocument(makeTab(true), makeHandlers());

    expect(
      view.element.classList.contains('chain-document--notes-collapsed')
    ).toBe(true);
    const body = view.element.querySelector('.chain-document__body');
    expect(body?.firstElementChild?.classList.contains('chain-document__scroll')).toBe(
      true
    );
    expect(body?.lastElementChild?.classList.contains('chain-composer')).toBe(
      true
    );

    view.update(makeTab(false));

    expect(
      view.element.classList.contains('chain-document--notes-collapsed')
    ).toBe(false);
    expect(
      view.element.querySelector<HTMLElement>('#chain-composer-body')?.hidden
    ).toBe(false);
  });
});
