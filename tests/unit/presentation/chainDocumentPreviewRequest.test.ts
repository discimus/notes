import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes: [
      {
        id: 'note-1',
        content: 'Conteudo encontrado na busca',
        chainId: 'chain-1',
        position: 1,
        role: 'tail',
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'note-2',
        content: 'Outra nota',
        chainId: 'chain-1',
        position: 2,
        role: 'tail',
        createdAt: '2026-01-03T10:00:00.000Z',
        updatedAt: '2026-01-03T10:00:00.000Z',
      },
    ],
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
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
  };
}

describe('Preview solicitado externamente', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('abre o preview da nota sem criar aba de edição', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    document.body.appendChild(view.element);

    view.previewNote('note-1', 'encontrado');

    const preview = view.element.querySelector<HTMLElement>(
      '#chain-note-preview'
    );
    expect(preview?.hidden).toBe(false);
    expect(preview?.textContent).toContain('Conteudo encontrado na busca');
    expect(
      view.element.querySelector(
        '[data-note-id="note-1"].chain-note--previewing'
      )
    ).not.toBeNull();

    view.destroy();
  });
});
