import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo',
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
  composerCollapsed: true,
  status: 'loaded',
};

function handlers(mode: 'latest' | 'blank' | 'none') {
  return {
    initialEditorMode: mode,
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onEditNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('Modo inicial do editor da coleção', () => {
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
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      return window.setTimeout(() => callback(0), 0) as unknown as number;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('não abre nenhuma nota automaticamente no modo none', () => {
    const onEditNote = vi.fn();
    const onNewDocument = vi.fn();
    mountChainDocument(tab, {
      ...handlers('none'),
      onEditNote,
      onNewDocument,
    });

    vi.advanceTimersByTime(10);

    expect(onEditNote).not.toHaveBeenCalled();
    expect(onNewDocument).not.toHaveBeenCalled();
  });

  it('abre um documento em branco no modo blank', () => {
    const onEditNote = vi.fn();
    const onNewDocument = vi.fn();
    mountChainDocument(tab, {
      ...handlers('blank'),
      onEditNote,
      onNewDocument,
    });

    vi.advanceTimersByTime(0);

    expect(onNewDocument).toHaveBeenCalledTimes(1);
    expect(onEditNote).not.toHaveBeenCalled();
  });
});
