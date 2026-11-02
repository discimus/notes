import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo da nota',
  chainId: 'chain-1',
  position: 0,
  role: 'header',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
};

const tab: ChainTab = {
  kind: 'chain',
  id: 'tab-chain',
  chainId: 'chain-1',
  title: 'Projeto',
  notes: [note],
  noteTabs: [{ id: 'note-tab-1', content: '' }],
  activeNoteTabId: 'note-tab-1',
  composerCollapsed: false,
  status: 'loaded',
};

describe('Exclusão de nota no documento da coleção', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto',
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

  it('expõe excluir no menu de opções e encaminha o id da nota', () => {
    const onDeleteNote = vi.fn();
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onNewDocument: vi.fn(),
      onDeleteNote,
    });
    document.body.appendChild(view.element);

    const options = view.element.querySelector<HTMLButtonElement>(
      '.chain-note__more'
    );
    expect(options?.getAttribute('aria-label')).toBe('Opções da nota');
    options?.click();

    const items = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '#note-menu [role="menuitem"]'
      ),
    ];
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'drive_file_moveMover para outra coleção',
      'deleteExcluir nota',
    ]);
    items[1]?.click();
    expect(onDeleteNote).toHaveBeenCalledWith('note-1');
  });

  it('move a nota pelo menu de opções', () => {
    const onMoveNote = vi.fn().mockResolvedValue(true);
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onNewDocument: vi.fn(),
      onMoveNote,
    });
    document.body.appendChild(view.element);

    view.element.querySelector<HTMLButtonElement>('.chain-note__more')?.click();
    document
      .querySelector<HTMLButtonElement>('#note-menu [role="menuitem"]')
      ?.click();

    expect(onMoveNote).toHaveBeenCalledWith('note-1');
  });
});
