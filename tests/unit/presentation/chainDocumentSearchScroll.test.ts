import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    createdAt: `2026-01-0${position + 1}T10:00:00.000Z`,
    updatedAt: `2026-01-0${position + 1}T10:00:00.000Z`,
  };
}

const notes = [
  makeNote('note-1', 'Primeira nota', 0),
  makeNote('note-2', 'Revisão do código encontrado', 1),
  makeNote('note-3', 'Última nota da cadeia', 2),
];

const tab: ChainTab = {
  kind: 'chain',
  id: 'tab-chain',
  chainId: 'chain-1',
  title: 'Projeto principal',
  notes,
  noteTabs: [
    {
      id: 'note-tab-2',
      content: notes[1]!.content,
      contentType: 'text',
      editingNoteId: 'note-2',
      baseContent: notes[1]!.content,
      baseContentType: 'text',
    },
  ],
  activeNoteTabId: 'note-tab-2',
  composerCollapsed: false,
  status: 'loaded',
};

function rect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

describe('Scroll até a nota encontrada', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      chainSummaries: [
        {
          id: 'chain-1',
          displayTitle: 'Projeto principal',
          noteCount: notes.length,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          tagIds: [],
          tags: [],
          headerExcerpt: 'Primeira nota',
        },
      ],
    });
  });

  it('centraliza a nota no container de scroll da cadeia', () => {
    const view = mountChainDocument(tab, {
      onNoteInput: vi.fn(),
      onSaveNote: vi.fn(),
      onCreateNote: vi.fn(),
      onSelectNote: vi.fn(),
      onCloseNote: vi.fn(),
      onNewDocument: vi.fn(),
    });
    document.body.appendChild(view.element);
    const scroll = view.element.querySelector<HTMLElement>(
      '#chain-document-scroll'
    )!;
    const target = view.element.querySelector<HTMLElement>(
      '[data-note-id="note-2"]'
    )!;
    Object.defineProperty(scroll, 'clientHeight', {
      configurable: true,
      value: 400,
    });
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(rect(0, 400));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(1000, 100));

    view.focusSearchMatch('revisao');

    expect(scroll.scrollTop).toBe(850);
  });
});
