import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO, NoteDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { AppController } from '@presentation/pages/AppController.js';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { mountEditorView } from '@presentation/views/editor.js';
import { getAutoImportFiles } from '@presentation/app/autoImportFiles.js';

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

function dropEvent(files: File[]): DragEvent {
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: ['Files'], files, dropEffect: 'none' },
  });
  return event;
}

describe('fluxo configuração de importação automática', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.body.innerHTML = '';
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

  it('ativa pelas configurações e importa sem modal', async () => {
    showSettingsDialog();
    document.querySelector<HTMLButtonElement>('#settings-tab-behavior')?.click();
    const checkbox = document.querySelector<HTMLInputElement>(
      '#settings-auto-import-files'
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();

    expect(getAutoImportFiles()).toBe(true);
    expect(localStorage.getItem('threadnotes.auto-import-files')).toBe('true');

    document.body.innerHTML = '<div id="editor-host"></div>';
    const host = document.getElementById('editor-host') as HTMLElement;
    cleanup = mountEditorView(host, new EditorStore());

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
      .dispatchEvent(
        dropEvent([
          new File(['Conteúdo do arquivo'], 'notas.txt', {
            lastModified: Date.UTC(2024, 2, 12, 14, 30),
          }),
        ])
      );

    await vi.waitFor(() => {
      expect(importNote).toHaveBeenCalled();
    });
    expect(document.querySelector('.import-dialog')).toBeNull();
  });
});
