import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';

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

function file(): File {
  return new File(['Conteúdo do arquivo'], 'notas.txt', {
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

function prepareSpy() {
  return vi.spyOn(AppController, 'prepareTextImport').mockResolvedValue({
    ok: true,
    data: {
      fileName: 'notas.txt',
      byteSize: 20,
      sourceModifiedAt: '2024-03-12T14:30:00.000Z',
      content: 'Conteúdo do arquivo',
      preview: 'Conteúdo do arquivo',
      characterCount: 20,
      truncated: false,
    },
  });
}

describe('Editor import view', () => {
  beforeEach(() => {
    sessionStorage.clear();
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

  it('abre preview ao soltar arquivo na sidebar e importa com data', async () => {
    const store = new EditorStore();
    const host = mount(store);
    prepareSpy();
    const importNote = vi.spyOn(AppController, 'importTextNote').mockResolvedValue({
      ok: true,
      note,
      chainTitle: 'Projeto',
    });

    host
      .querySelector<HTMLElement>('.editor-sidebar .chain-item')!
      .dispatchEvent(dropEvent([file()]));

    await vi.waitFor(() => {
      expect(document.querySelector('.import-dialog')).not.toBeNull();
    });
    expect(document.querySelector('.import-dialog')?.textContent).toContain('notas.txt');

    document.querySelector<HTMLButtonElement>('[id^="import-confirm-"]')?.click();

    await vi.waitFor(() => {
      expect(importNote).toHaveBeenCalledWith(
        'chain-1',
        'Conteúdo do arquivo',
        '2024-03-12T14:30:00.000Z'
      );
    });
  });

  it('processa múltiplos arquivos usando o diálogo de lote', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const prepare = prepareSpy();
    const preparedFile = {
      fileName: 'notas.txt',
      byteSize: 20,
      sourceModifiedAt: '2024-03-12T14:30:00.000Z',
      content: 'Conteúdo do arquivo',
      preview: 'Conteúdo do arquivo',
      head: 'Conteúdo do arquivo',
      hasMoreLines: false,
      characterCount: 20,
      truncated: false,
    };
    const prepareBatch = vi
      .spyOn(AppController, 'prepareTextImportBatch')
      .mockResolvedValue({
        ok: true,
        data: {
          valid: [preparedFile, { ...preparedFile, fileName: 'outro.txt' }],
          rejected: [],
          totalBytes: 40,
        },
      });
    const importNotes = vi.spyOn(AppController, 'importTextNotes').mockResolvedValue({
      ok: true,
      notes: [note, { ...note, id: 'note-2' }],
      chainTitle: 'Projeto',
    });

    host
      .querySelector<HTMLElement>('.editor-sidebar .chain-item')!
      .dispatchEvent(dropEvent([file(), file()]));

    await vi.waitFor(() => {
      expect(document.querySelector('.import-files-dialog')).not.toBeNull();
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(prepareBatch).toHaveBeenCalled();

    document.querySelector<HTMLButtonElement>('[id^="import-files-confirm-"]')?.click();

    await vi.waitFor(() => {
      expect(importNotes).toHaveBeenCalledWith(
        'chain-1',
        [preparedFile, { ...preparedFile, fileName: 'outro.txt' }],
        true
      );
    });
  });

  it('aceita drop na área da coleção aberta', async () => {
    const store = new EditorStore();
    const host = mount(store);
    store.openChainTab('chain-1', 'Projeto');
    prepareSpy();
    const importNote = vi.spyOn(AppController, 'importTextNote').mockResolvedValue({
      ok: true,
      note,
      chainTitle: 'Projeto',
    });

    await vi.waitFor(() => {
      expect(host.querySelector('.chain-document')).not.toBeNull();
    });
    host.querySelector('.chain-document')!.dispatchEvent(dropEvent([file()]));

    await vi.waitFor(() => {
      expect(document.querySelector('.import-dialog')).not.toBeNull();
    });
    document.querySelector<HTMLButtonElement>('[id^="import-confirm-"]')?.click();

    await vi.waitFor(() => {
      expect(importNote).toHaveBeenCalledWith(
        'chain-1',
        'Conteúdo do arquivo',
        '2024-03-12T14:30:00.000Z'
      );
    });
  });
});
