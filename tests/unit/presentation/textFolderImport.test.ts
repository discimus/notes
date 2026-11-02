import { describe, expect, it } from 'vitest';
import {
  filesFromDirectoryInput,
  folderPathOf,
  folderTitleFromPath,
  groupFilesByFolder,
  normalizeRelativePath,
  type FolderTextFile,
} from '@presentation/app/textFolderImport.js';

function file(name: string, relativePath?: string): File {
  const value = new File(['conteúdo'], name, { type: 'text/plain' });
  if (relativePath !== undefined) {
    Object.defineProperty(value, 'webkitRelativePath', {
      configurable: true,
      value: relativePath,
    });
  }
  return value;
}

function entry(name: string, relativePath: string): FolderTextFile {
  return { file: file(name), relativePath };
}

describe('textFolderImport', () => {
  it('normaliza separadores e caminhos', () => {
    expect(normalizeRelativePath('\\Raiz\\sub\\a.txt')).toBe('Raiz/sub/a.txt');
    expect(normalizeRelativePath('/Raiz//a.txt')).toBe('Raiz/a.txt');
    expect(folderPathOf('Raiz/sub/a.txt')).toBe('Raiz/sub');
    expect(folderPathOf('Raiz/a.txt')).toBe('Raiz');
    expect(folderPathOf('a.txt')).toBe('');
    expect(folderTitleFromPath('Raiz/sub')).toBe('sub');
  });

  it('agrupa por pasta direta, ordena e ignora arquivos sem pasta', () => {
    const groups = groupFilesByFolder([
      entry('b.txt', 'Raiz/b.txt'),
      entry('a.txt', 'Raiz/sub/a.txt'),
      entry('c.txt', 'Raiz/sub/c.txt'),
      entry('solto.txt', 'solto.txt'),
    ]);

    expect(groups.map((group) => group.title)).toEqual(['Raiz', 'sub']);
    expect(groups[0]?.files.map((item) => item.relativePath)).toEqual([
      'Raiz/b.txt',
    ]);
    expect(groups[1]?.files.map((item) => item.relativePath)).toEqual([
      'Raiz/sub/a.txt',
      'Raiz/sub/c.txt',
    ]);
  });

  it('usa o nome da pasta raiz para arquivos soltos na raiz', () => {
    const groups = groupFilesByFolder([entry('raiz.txt', 'MinhaPasta/raiz.txt')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe('MinhaPasta');
  });

  it('converte arquivos de um input de diretório', () => {
    const input = [
      file('a.txt', 'Raiz/sub/a.txt'),
      file('sem-caminho.txt'),
    ];
    const result = filesFromDirectoryInput(input);
    expect(result).toHaveLength(1);
    expect(result[0]?.relativePath).toBe('Raiz/sub/a.txt');
  });

  it('mantém pastas com o mesmo nome em caminhos diferentes separadas', () => {
    const groups = groupFilesByFolder([
      entry('a.txt', 'A/docs/a.txt'),
      entry('b.txt', 'B/docs/b.txt'),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.title)).toEqual(['docs', 'docs']);
    expect(groups.map((group) => group.folderPath)).toEqual(['A/docs', 'B/docs']);
  });
});
