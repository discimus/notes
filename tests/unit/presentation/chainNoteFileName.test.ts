import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { ChainTab } from '@presentation/state/EditorStore.js';
import { appState } from '@presentation/state/AppState.js';
import { mountChainDocument } from '@presentation/components/ChainDocument.js';

function note(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'Conteúdo da nota',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    contentType: 'text',
    sourceFileName: '26010214-conteudo-da-nota.txt',
    createdAt: '2026-01-02T14:00:00.000Z',
    updatedAt: '2026-01-02T14:00:00.000Z',
    ...overrides,
  };
}

function tab(source: NoteDTO): ChainTab {
  return {
    kind: 'chain',
    id: 'tab-chain',
    chainId: 'chain-1',
    title: 'Projeto principal',
    notes: [source],
    noteTabs: [{ id: 'note-tab-1', content: '' }],
    activeNoteTabId: 'note-tab-1',
    composerCollapsed: false,
    status: 'loaded',
  };
}

function handlers() {
  return {
    onNoteInput: vi.fn(),
    onSaveNote: vi.fn(),
    onCreateNote: vi.fn(),
    onSelectNote: vi.fn(),
    onCloseNote: vi.fn(),
    onNewDocument: vi.fn(),
  };
}

describe('ChainDocument nome do arquivo', () => {
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

  it('exibe label com o nome do arquivo na listagem de notas', () => {
    const view = mountChainDocument(tab(note()), handlers());

    const label = view.element.querySelector<HTMLElement>('.chain-note__file');
    expect(label?.getAttribute('title')).toBe('26010214-conteudo-da-nota.txt');
    expect(
      label?.querySelector('.chain-note__file-name')?.textContent
    ).toBe('26010214-conteudo-da-nota.txt');
    expect(
      label?.querySelector('.chain-note__file-icon')?.textContent
    ).toBe('description');
  });

  it('não exibe a label quando a nota não possui nome de arquivo', () => {
    const view = mountChainDocument(
      tab(note({ sourceFileName: undefined })),
      handlers()
    );

    expect(view.element.querySelector('.chain-note__file')).toBeNull();
  });
});
