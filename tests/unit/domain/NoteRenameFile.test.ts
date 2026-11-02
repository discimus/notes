import { describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import { ValidationError } from '@shared/types/index.js';

describe('renomear arquivo da Note', () => {
  it('renomeia o arquivo preservando a nota', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const note = chain.appendImportedText('Conteúdo', undefined, {
      sourceFileName: 'original.md',
    });

    note.renameSourceFileName('  novo-nome.md  ', new Set());

    expect(note.sourceFileName).toBe('novo-nome.md');
  });

  it('adiciona sufixo quando o nome já existe na coleção', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const note = chain.appendImportedText('Conteúdo', undefined, {
      sourceFileName: 'original.md',
    });

    note.renameSourceFileName('nota.md', new Set(['nota.md', 'nota-02.md']));

    expect(note.sourceFileName).toBe('nota-03.md');
  });

  it('recusa nome vazio', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const note = chain.appendImportedText('Conteúdo', undefined, {
      sourceFileName: 'original.md',
    });

    expect(() => note.renameSourceFileName('   ', new Set())).toThrow(ValidationError);
    expect(note.sourceFileName).toBe('original.md');
  });
});
