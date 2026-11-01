import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

const content = 'Primeira linha\nRevisão do código final';

const note: NoteDTO = {
  id: 'note-1',
  content,
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
  title: 'Projeto principal',
  notes: [note],
  noteTabs: [
    {
      id: 'note-tab-1',
      content,
      contentType: 'text',
      editingNoteId: note.id,
      baseContent: content,
      baseContentType: 'text',
    },
  ],
  activeNoteTabId: 'note-tab-1',
  composerCollapsed: false,
  status: 'loaded',
};

describe('Foco da ocorrência no editor da nota', () => {
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
          headerExcerpt: 'Primeira linha',
        },
      ],
    });
  });

  it('foca e seleciona a ocorrência normalizada do termo', () => {
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onNewDocument: vi.fn(),
    });
    document.body.appendChild(view.element);

    view.focusSearchMatch('revisao');

    const composer = view.element.querySelector<HTMLTextAreaElement>(
      '#chain-composer-input'
    )!;
    const start = content.indexOf('Revisão');
    expect(document.activeElement).toBe(composer);
    expect(composer.selectionStart).toBe(start);
    expect(composer.selectionEnd).toBe(start + 'Revisão'.length);
  });
});
