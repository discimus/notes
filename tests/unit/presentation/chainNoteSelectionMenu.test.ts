import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function makeNote(id: string, content: string, position: number): NoteDTO {
  return {
    id,
    content,
    chainId: 'chain-1',
    position,
    role: position === 0 ? 'header' : 'tail',
    createdAt: `2026-01-02T${10 + position}:00:00.000Z`,
    updatedAt: `2026-01-02T${10 + position}:00:00.000Z`,
  };
}

const notes = [
  makeNote('note-1', 'Primeira nota', 0),
  makeNote('note-2', 'Segunda nota', 1),
];

function makeTab(): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto',
    notes,
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
    onRename: vi.fn(),
    onMoveSelected: vi.fn().mockResolvedValue(true),
    onDeleteSelected: vi.fn().mockResolvedValue(true),
  };
}

describe('Menu contextual de notas selecionadas', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
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
    document.querySelector<HTMLElement>('#chain-menu')?.remove();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  function openSelectionMenu(view: ReturnType<typeof mountChainDocument>) {
    view.element
      .querySelector<HTMLButtonElement>('#chain-note-select-toggle')
      ?.click();
    view.element
      .querySelector<HTMLInputElement>('[data-note-select="note-1"]')
      ?.click();
    view.element
      .querySelector<HTMLButtonElement>('#chain-more')
      ?.click();
    return [
      ...document.querySelectorAll<HTMLButtonElement>(
        '#chain-menu [role="menuitem"]'
      ),
    ];
  }

  it('mostra mover e excluir selecionadas quando há notas marcadas', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    const items = openSelectionMenu(view);

    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'drive_file_moveMover selecionadas',
      'deleteExcluir selecionadas',
    ]);
    expect(items[1]?.classList.contains('chain-menu__item--danger')).toBe(true);
    expect(document.body.textContent).not.toContain('Renomear');
    expect(document.body.textContent).not.toContain('Arquivar selecionadas');
    expect(document.activeElement).toBe(items[0]);
  });

  it('move os IDs selecionados e encerra o modo de seleção', async () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const items = openSelectionMenu(view);

    items[0]?.click();

    await vi.waitFor(() => {
      expect(handlers.onMoveSelected).toHaveBeenCalledWith(['note-1']);
      expect(
        view.element.classList.contains('chain-document--selection')
      ).toBe(false);
    });
  });

  it('exclui os IDs selecionados e encerra o modo de seleção', async () => {
    const handlers = makeHandlers();
    const view = mountChainDocument(makeTab(), handlers);
    const items = openSelectionMenu(view);

    items[1]?.click();

    await vi.waitFor(() => {
      expect(handlers.onDeleteSelected).toHaveBeenCalledWith(['note-1']);
      expect(
        view.element.classList.contains('chain-document--selection')
      ).toBe(false);
    });
  });

  it('mantém a seleção quando a exclusão é cancelada', async () => {
    const handlers = makeHandlers();
    handlers.onDeleteSelected.mockResolvedValue(false);
    const view = mountChainDocument(makeTab(), handlers);
    const items = openSelectionMenu(view);

    items[1]?.click();

    await vi.waitFor(() => {
      expect(handlers.onDeleteSelected).toHaveBeenCalledWith(['note-1']);
    });
    expect(
      view.element.classList.contains('chain-document--selection')
    ).toBe(true);
  });

  it('mantém o menu normal sem notas selecionadas', () => {
    const view = mountChainDocument(makeTab(), makeHandlers());
    view.element
      .querySelector<HTMLButtonElement>('#chain-more')
      ?.click();

    const labels = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '#chain-menu [role="menuitem"]'
      ),
    ].map((item) => item.textContent?.trim());
    expect(labels).toEqual([
      'editRenomear',
      'archiveArquivar',
      'deleteMover para lixeira',
    ]);
  });
});
