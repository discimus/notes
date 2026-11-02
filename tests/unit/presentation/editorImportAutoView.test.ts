import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { setAutoImportFiles } from '@presentation/app/autoImportFiles.js';
import type { TextImportItem } from '@presentation/app/textFileImport.js';

let cleanup: (() => void) | null = null;

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto',
  noteCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

const note: NoteDTO = {
  id: 'note-imported',
  content: 'Conteúdo do arquivo',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  contentType: 'text',
  createdAt: '2024-03-12T14:30:00.000Z',
  updatedAt: '2024-03-12T14:30:00.000Z',
};

function file(name = 'notas.txt'): File {
  return new File(['Conteúdo do arquivo'], name, {
    lastModified: Date.UTC(2024, 2, 12, 14, 30),
  });
}

function dropEvent(files: File[]): DragEvent {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files, dropEffect: 'none' },
  });
  return event;
}

function mount(store: EditorStore): HTMLElement {
  document.body.innerHTML = '<div id="editor-host"></div>';
  const host = document.getElementById('editor-host') as HTMLElement;
  cleanup = mountEditorView(host, store);
  return host;
}

describe('Editor importação automática', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setAutoImportFiles(true);
    appState.set({
      view: 'editor',
      chainSummaries: [chain],
      chainFilterQuery: '',
      isLoading: false,
    });
    vi.spyOn(AppController, 'loadEditorChainTab').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('importa arquivo único sem abrir a modal de confirmação', async () => {
    const store = new EditorStore();
    const host = mount(store);
    vi.spyOn(AppController, 'prepareTextImport').mockResolvedValue({
      ok: true,
      data: {
        fileName: 'notas.txt',
        byteSize: 20,
        sourceModifiedAt: '2024-03-12T14:30:00.000Z',
        content: 'Conteúdo do arquivo',
        preview: 'Conteúdo do arquivo',
        characterCount: 20,
        truncated: false,
        contentHash: 'hash-abc',
      },
    });
    const importNote = vi.spyOn(AppController, 'importTextNote').mockResolvedValue({
      ok: true,
      note,
      chainTitle: 'Projeto',
    });

    host
      .querySelector<HTMLElement>('.editor-sidebar .chain-item')!
      .dispatchEvent(dropEvent([file()]));

    await vi.waitFor(() => {
      expect(importNote).toHaveBeenCalledWith(
        'chain-1',
        'Conteúdo do arquivo',
        '2024-03-12T14:30:00.000Z',
        {
          contentHash: 'hash-abc',
          sourceFileName: 'notas.txt',
        }
      );
    });
    expect(document.querySelector('.import-dialog')).toBeNull();
  });

  it('importa múltiplos arquivos sem abrir a modal de confirmação', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const source = [file('a.txt'), file('b.txt')];
    const items: TextImportItem[] = source.map((entry, index) => ({
      index,
      file: entry,
      fileName: entry.name,
      byteSize: entry.size,
      status: 'pending',
    }));

    vi.spyOn(AppController, 'prepareTextImportBatch').mockResolvedValue({
      ok: true,
      data: {
        valid: [],
        rejected: [],
        totalBytes: source.reduce((sum, entry) => sum + entry.size, 0),
        items,
      },
    });
    const importQueue = vi
      .spyOn(AppController, 'importTextFileQueue')
      .mockResolvedValue({
        items,
        total: items.length,
        succeeded: items.length,
        failed: 0,
        duplicates: 0,
        storage: null,
      });

    host
      .querySelector<HTMLElement>('.editor-sidebar .chain-item')!
      .dispatchEvent(dropEvent(source));

    await vi.waitFor(() => {
      expect(importQueue).toHaveBeenCalledWith('chain-1', items, true);
    });
    expect(document.querySelector('.import-queue-dialog')).toBeNull();
    expect(document.querySelector('.import-files-dialog')).toBeNull();
  });
});
