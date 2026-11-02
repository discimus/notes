import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { AppController } from '@presentation/pages/AppController.js';
import { startFolderImport } from '@presentation/app/folderImportLauncher.js';
import { editorStore } from '@presentation/state/EditorStore.js';
import type { FolderTextFile } from '@presentation/app/textFolderImport.js';

const importedNote: NoteDTO = {
  id: 'note-1',
  content: 'conteudo',
  chainId: 'chain-1',
  position: 2,
  role: 'tail',
  contentType: 'text',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function folderFile(name: string, relativePath = `Pasta/${name}`): FolderTextFile {
  return {
    file: new File(['conteudo'], name, { type: 'text/plain', lastModified: 0 }),
    relativePath,
  };
}

function createdChain(title: string): ChainDetailDTO {
  return {
    id: title,
    displayTitle: title,
    noteCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    notes: [importedNote],
  };
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function closeDialog(): Promise<void> {
  document
    .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
    ?.click();
  await flush();
}

describe('folderImportLauncher', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    sessionStorage.clear();
    editorStore.openChainTab('chain-1', 'Projeto principal');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('adiciona à coleção em destaque quando escolhido', async () => {
    const importTextNotes = vi
      .spyOn(AppController, 'importTextNotes')
      .mockResolvedValue({
        ok: true,
        notes: [importedNote],
        chainTitle: 'Projeto principal',
      });
    const importTextFolder = vi.spyOn(AppController, 'importTextFolder');

    void startFolderImport([folderFile('a.txt')]);
    await flush();

    const appendRadio = document.querySelector<HTMLInputElement>(
      'input[value="append"]'
    );
    expect(appendRadio).not.toBeNull();
    appendRadio!.checked = true;
    appendRadio!.dispatchEvent(new Event('change', { bubbles: true }));

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await flush();

    expect(importTextNotes).toHaveBeenCalledWith(
      'chain-1',
      expect.any(Array),
      false,
      { silent: true }
    );
    expect(importTextFolder).not.toHaveBeenCalled();

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await flush();
  });

  it('cria coleções filhas prefixadas com o nome da pasta pai', async () => {
    const importTextFolder = vi
      .spyOn(AppController, 'importTextFolder')
      .mockImplementation(async (title) => ({
        ok: true,
        status: 'created',
        chain: createdChain(title),
        notes: [importedNote],
        duplicates: 0,
      }));

    void startFolderImport([
      folderFile('a.txt', 'Pasta/a.txt'),
      folderFile('b.txt', 'Pasta/Sub/b.txt'),
    ]);
    await flush();

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await flush();

    expect(importTextFolder.mock.calls.map((call) => call[0])).toEqual([
      'Pasta',
      'Pasta-Sub',
    ]);

    await closeDialog();
  });

  it('migra o conteúdo das subpastas para a coleção pai quando escolhido', async () => {
    const importTextFolder = vi
      .spyOn(AppController, 'importTextFolder')
      .mockImplementation(async (title) => ({
        ok: true,
        status: 'created',
        chain: createdChain(title),
        notes: [importedNote],
        duplicates: 0,
      }));

    void startFolderImport([
      folderFile('a.txt', 'Pasta/a.txt'),
      folderFile('b.txt', 'Pasta/Sub/b.txt'),
    ]);
    await flush();

    const mergeRadio = document.querySelector<HTMLInputElement>(
      'input[value="merge"]'
    )!;
    mergeRadio.checked = true;
    mergeRadio.dispatchEvent(new Event('change', { bubbles: true }));

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await flush();

    expect(importTextFolder.mock.calls.map((call) => call[0])).toEqual([
      'Pasta',
    ]);

    await closeDialog();
  });
});
