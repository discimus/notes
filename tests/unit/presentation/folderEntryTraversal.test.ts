import { describe, expect, it } from 'vitest';
import { collectFolderFilesFromEntries } from '@presentation/app/textFolderImport.js';

function textFile(name: string): File {
  return new File([`conteúdo de ${name}`], name, { type: 'text/plain' });
}

function fileEntry(
  fullPath: string,
  name: string
): FileSystemEntry {
  return {
    isDirectory: false,
    isFile: true,
    name,
    fullPath,
    file: (onSuccess: (file: File) => void) => onSuccess(textFile(name)),
  } as unknown as FileSystemEntry;
}

function directoryEntry(
  fullPath: string,
  batches: FileSystemEntry[][]
): FileSystemEntry {
  return {
    isDirectory: true,
    isFile: false,
    name: fullPath.split('/').filter(Boolean).at(-1) ?? 'pasta',
    fullPath,
    createReader: () => {
      let index = 0;
      return {
        readEntries: (
          onSuccess: (entries: FileSystemEntry[]) => void,
          _onError: (error: DOMException) => void
        ) => {
          const entries = batches[index] ?? [];
          index += 1;
          onSuccess(entries);
        },
      };
    },
  } as unknown as FileSystemEntry;
}

function failingDirectoryEntry(fullPath: string): FileSystemEntry {
  return {
    isDirectory: true,
    isFile: false,
    name: 'falha',
    fullPath,
    createReader: () => ({
      readEntries: (
        _onSuccess: (entries: FileSystemEntry[]) => void,
        onError: (error: DOMException) => void
      ) => {
        onError(new DOMException('sem permissão', 'NotAllowedError'));
      },
    }),
  } as unknown as FileSystemEntry;
}

describe('collectFolderFilesFromEntries', () => {
  it('percorre diretórios recursivamente e pagina readEntries', async () => {
    const sub = directoryEntry('/Raiz/sub', [
      [fileEntry('/Raiz/sub/c.txt', 'c.txt')],
      [],
    ]);
    const root = directoryEntry('/Raiz', [
      [fileEntry('/Raiz/a.txt', 'a.txt'), sub],
      [fileEntry('/Raiz/b.txt', 'b.txt')],
      [],
    ]);

    const result = await collectFolderFilesFromEntries([root]);

    expect(result.errors).toEqual([]);
    expect(result.files.map((entry) => entry.relativePath).sort()).toEqual([
      'Raiz/a.txt',
      'Raiz/b.txt',
      'Raiz/sub/c.txt',
    ]);
  });

  it('registra erro de leitura e continua o restante', async () => {
    const root = directoryEntry('/Raiz', [
      [failingDirectoryEntry('/Raiz/bloqueada'), fileEntry('/Raiz/a.txt', 'a.txt')],
      [],
    ]);

    const result = await collectFolderFilesFromEntries([root]);

    expect(result.files.map((entry) => entry.relativePath)).toEqual([
      'Raiz/a.txt',
    ]);
    expect(result.errors[0]).toContain('/Raiz/bloqueada');
  });
});
