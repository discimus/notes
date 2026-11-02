import { afterEach, describe, expect, it, vi } from 'vitest';
import { showImportFolderDialog } from '@presentation/components/ImportFolderDialog.js';
import type {
  FolderImportProgress,
  FolderImportResult,
} from '@presentation/app/folderImportFlow.js';

function emptyProgress(): FolderImportProgress {
  return {
    foldersTotal: 2,
    foldersProcessed: 2,
    currentFolder: null,
    filesTotal: 3,
    filesProcessed: 3,
    notesImported: 3,
    duplicates: 0,
    failedFiles: 0,
    failedFolders: 0,
    skippedFolders: 0,
  };
}

function result(): FolderImportResult {
  return {
    ...emptyProgress(),
    createdChains: [
      { title: 'Pasta A', chainId: 'chain-a', notesImported: 2 },
      { title: 'Pasta B', chainId: 'chain-b', notesImported: 1 },
    ],
    failures: [],
    cancelled: false,
  };
}

describe('ImportFolderDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('lista as pastas, executa e mantém o resultado aberto', async () => {
    const onConfirm = vi.fn(
      async (
        _mode: string,
        _useDates: boolean,
        onProgress: (progress: FolderImportProgress) => void
      ) => {
        onProgress({ ...emptyProgress(), filesProcessed: 1 });
        return result();
      }
    );

    const pending = showImportFolderDialog({
      groups: [
        {
          title: 'Pasta A',
          fileCount: 2,
          totalBytes: 10,
          rejectedCount: 0,
        },
        {
          title: 'Pasta B',
          fileCount: 1,
          totalBytes: 5,
          rejectedCount: 0,
        },
      ],
      totalFiles: 3,
      totalBytes: 15,
      showDateOption: true,
      onConfirm,
    });

    expect(document.body.textContent).toContain('Pasta A');
    expect(document.body.textContent).toContain('Pasta B');

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onConfirm).toHaveBeenCalledWith(
      'collections',
      true,
      expect.any(Function),
      expect.any(Function)
    );
    expect(document.body.textContent).toContain('3 notas importadas');
    expect(document.body.textContent).toContain('Fechar');

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();

    await expect(pending).resolves.toBe(true);
  });

  it('desabilita a confirmação quando não há pastas', async () => {
    const onConfirm = vi.fn();

    const pending = showImportFolderDialog({
      groups: [],
      totalFiles: 0,
      totalBytes: 0,
      showDateOption: false,
      onConfirm,
    });

    const confirm = document.querySelector<HTMLButtonElement>(
      '[id^="import-folder-confirm-"]'
    );
    expect(confirm?.disabled).toBe(true);
    expect(document.body.textContent).not.toContain('Usar datas dos arquivos');

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-cancel-"]')
      ?.click();

    await expect(pending).resolves.toBe(false);
  });

  it('respeita o switch de datas desmarcado', async () => {
    const onConfirm = vi.fn(
      async () => result()
    );

    const pending = showImportFolderDialog({
      groups: [
        { title: 'Pasta A', fileCount: 1, totalBytes: 5, rejectedCount: 0 },
      ],
      totalFiles: 1,
      totalBytes: 5,
      showDateOption: true,
      onConfirm,
    });

    const dateSwitch = document.querySelector<HTMLInputElement>(
      '[id^="import-folder-date-"]'
    )!;
    dateSwitch.checked = false;
    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onConfirm).toHaveBeenCalledWith(
      'collections',
      false,
      expect.any(Function),
      expect.any(Function)
    );

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-cancel-"]')
      ?.click();

    await expect(pending).resolves.toBe(false);
  });

  it('permite adicionar as pastas à coleção em destaque', async () => {
    const onConfirm = vi.fn(async () => result());

    const pending = showImportFolderDialog({
      groups: [
        { title: 'Pasta A', fileCount: 1, totalBytes: 5, rejectedCount: 0 },
      ],
      totalFiles: 1,
      totalBytes: 5,
      showDateOption: false,
      appendTarget: { id: 'chain-1', title: 'Projeto principal' },
      onConfirm,
    });

    expect(document.body.textContent).toContain('Adicionar à coleção');
    const appendRadio = document.querySelector<HTMLInputElement>(
      'input[value="append"]'
    )!;
    appendRadio.checked = true;
    appendRadio.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.body.textContent).toContain(
      'Adicionar 1 documento à coleção "Projeto principal".'
    );

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onConfirm).toHaveBeenCalledWith(
      'append',
      false,
      expect.any(Function),
      expect.any(Function)
    );

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();

    await expect(pending).resolves.toBe(true);
  });

  it('solicita cancelamento durante a importação', async () => {
    const control = {
      isCancelled: (): boolean => false,
      resolve: (_value: FolderImportResult): void => {},
    };
    const onConfirm = vi.fn(
      (
        _mode: string,
        _useDates: boolean,
        _onProgress: unknown,
        cancelled: () => boolean
      ) =>
        new Promise<FolderImportResult>((resolve) => {
          control.isCancelled = cancelled;
          control.resolve = resolve;
        })
    );

    const pending = showImportFolderDialog({
      groups: [
        { title: 'Pasta A', fileCount: 1, totalBytes: 5, rejectedCount: 0 },
      ],
      totalFiles: 1,
      totalBytes: 5,
      showDateOption: false,
      onConfirm,
    });

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(control.isCancelled()).toBe(false);

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-cancel-"]')
      ?.click();

    expect(control.isCancelled()).toBe(true);
    expect(
      document.querySelector<HTMLButtonElement>(
        '[id^="import-folder-cancel-"]'
      )?.textContent
    ).toBe('Cancelando...');

    control.resolve({
      ...result(),
      createdChains: [],
      failures: [],
      cancelled: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.body.textContent).toContain('Fechar');

    document
      .querySelector<HTMLButtonElement>('[id^="import-folder-confirm-"]')
      ?.click();

    await expect(pending).resolves.toBe(true);
  });
});
