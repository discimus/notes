import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
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

function folderFile(name: string): FolderTextFile {
  return {
    file: new File(['conteudo'], name, { type: 'text/plain', lastModified: 0 }),
    relativePath: `Pasta/${name}`,
  };
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
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
});
