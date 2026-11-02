import { describe, expect, it, vi } from 'vitest';
import { processFolderImport } from '@presentation/app/folderImportFlow.js';
import type { PreparedTextImport } from '@presentation/app/textFileImport.js';
import type { FolderImportGroup } from '@presentation/app/textFolderImport.js';

function group(title: string, fileNames: string[]): FolderImportGroup {
  return {
    title,
    folderPath: title,
    files: fileNames.map((name) => ({
      file: new File(['conteúdo'], name, { type: 'text/plain' }),
      relativePath: `${title}/${name}`,
    })),
  };
}

function prepared(fileName: string): PreparedTextImport {
  return {
    fileName,
    byteSize: 8,
    content: `conteúdo de ${fileName}`,
    preview: `conteúdo de ${fileName}`,
    characterCount: 20,
    truncated: false,
  };
}

function batch(valid: PreparedTextImport[]) {
  return { valid, rejected: [], totalBytes: 8 * valid.length };
}

describe('processFolderImport', () => {
  it('importa cada pasta e agrega o progresso', async () => {
    const importFolder = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 'created',
        chain: { id: 'chain-a' },
        notes: [{}, {}],
        duplicates: 0,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 'created',
        chain: { id: 'chain-b' },
        notes: [{}],
        duplicates: 1,
      });
    const onProgress = vi.fn();

    const result = await processFolderImport({
      groups: [group('Pasta A', ['a.txt', 'b.txt']), group('Pasta B', ['c.txt'])],
      useSourceDates: true,
      prepareFiles: async (files) =>
        batch(files.map((file) => prepared(file.name))),
      importFolder,
      onProgress,
    });

    expect(importFolder).toHaveBeenCalledTimes(2);
    expect(result.createdChains).toEqual([
      { title: 'Pasta A', chainId: 'chain-a', notesImported: 2 },
      { title: 'Pasta B', chainId: 'chain-b', notesImported: 1 },
    ]);
    expect(result.notesImported).toBe(3);
    expect(result.duplicates).toBe(1);
    expect(result.foldersProcessed).toBe(2);
    expect(result.filesProcessed).toBe(3);
    expect(result.cancelled).toBe(false);
    expect(onProgress).toHaveBeenCalled();
  });

  it('ignora pasta sem arquivos válidos', async () => {
    const importFolder = vi.fn();

    const result = await processFolderImport({
      groups: [group('Vazia', ['a.txt'])],
      useSourceDates: false,
      prepareFiles: async () => ({
        valid: [],
        rejected: [{ fileName: 'a.txt', byteSize: 0, error: 'vazio' }],
        totalBytes: 0,
      }),
      importFolder,
    });

    expect(importFolder).not.toHaveBeenCalled();
    expect(result.skippedFolders).toBe(1);
    expect(result.failedFiles).toBe(1);
    expect(result.failures[0]?.message).toContain('vazio');
  });

  it('isola falhas por pasta e continua', async () => {
    const importFolder = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'falha na pasta' })
      .mockResolvedValueOnce({
        ok: true,
        status: 'created',
        chain: { id: 'chain-ok' },
        notes: [{}],
        duplicates: 0,
      });

    const result = await processFolderImport({
      groups: [group('Erro', ['a.txt']), group('Ok', ['b.txt'])],
      useSourceDates: false,
      prepareFiles: async (files) =>
        batch(files.map((file) => prepared(file.name))),
      importFolder,
    });

    expect(result.failedFolders).toBe(1);
    expect(result.createdChains).toHaveLength(1);
    expect(result.failures[0]).toEqual({
      folder: 'Erro',
      message: 'falha na pasta',
    });
  });
});
