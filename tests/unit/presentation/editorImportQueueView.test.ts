import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { mountEditorView } from '@presentation/views/editor.js';
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

function files(): File[] {
  return Array.from(
    { length: 12 },
    (_, index) =>
      new File([`texto ${index}`], `nota-${index}.txt`, {
        lastModified: Date.UTC(2024, 2, 12, 14, 30) + index,
      })
  );
}

function items(source: File[]): TextImportItem[] {
  return source.map((file, index) => ({
    index,
    file,
    fileName: file.name,
    byteSize: file.size,
    status: 'pending',
  }));
}

function dropEvent(dropped: File[]): DragEvent {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files: dropped, dropEffect: 'none' },
  });
  return event;
}

function mount(store: EditorStore): HTMLElement {
  document.body.innerHTML = '<div id="editor-host"></div>';
  const host = document.getElementById('editor-host') as HTMLElement;
  cleanup = mountEditorView(host, store);
  return host;
}

describe('Editor import queue view', () => {
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

  it('usa o diálogo de progresso e importa mais de 10 arquivos em lote', async () => {
    const store = new EditorStore();
    const host = mount(store);
    const source = files();
    const planItems = items(source);

    const prepareBatch = vi
      .spyOn(AppController, 'prepareTextImportBatch')
      .mockResolvedValue({
        ok: true,
        data: {
          valid: [],
          rejected: [],
          totalBytes: source.reduce((sum, file) => sum + file.size, 0),
          items: planItems,
        },
      });

    const imported = planItems.map((entry) => ({ ...entry, status: 'imported' as const }));
    const importQueue = vi
      .spyOn(AppController, 'importTextFileQueue')
      .mockResolvedValue({
        items: imported,
        total: imported.length,
        succeeded: imported.length,
        failed: 0,
        duplicates: 0,
        storage: null,
      });

    host
      .querySelector<HTMLElement>('.editor-sidebar .chain-item')!
      .dispatchEvent(dropEvent(source));

    await vi.waitFor(() => {
      expect(document.querySelector('.import-queue-dialog')).not.toBeNull();
    });
    expect(prepareBatch).toHaveBeenCalledWith(source);
    expect(document.querySelectorAll('.import-batch-item')).toHaveLength(12);

    document
      .querySelector<HTMLButtonElement>('[id^="import-queue-confirm-"]')
      ?.click();

    await vi.waitFor(() => {
      expect(importQueue).toHaveBeenCalledWith(
        'chain-1',
        planItems,
        true,
        expect.any(Function)
      );
    });
    await vi.waitFor(() => {
      expect(document.querySelectorAll('.import-batch-item__status--ok')).toHaveLength(
        12
      );
    });
  });
});
