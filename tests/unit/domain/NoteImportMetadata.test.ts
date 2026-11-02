import { describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';

describe('metadados de importação da Note', () => {
  it('preserva nome original e hash de conteúdo em tails importadas', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const note = chain.appendImportedText('Conteúdo', undefined, {
      contentHash: 'hash-a',
      sourceFileName: 'arquivo.txt',
    });

    expect(note.contentHash).toBe('hash-a');
    expect(note.sourceFileName).toBe('arquivo.txt');
    expect(note.toData()).toMatchObject({
      contentHash: 'hash-a',
      sourceFileName: 'arquivo.txt',
    });
  });

  it('remove o hash ao editar o conteúdo e mantém o nome original', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const note = chain.appendImportedText('Conteúdo', undefined, {
      contentHash: 'hash-a',
      sourceFileName: 'arquivo.txt',
    });

    note.updateContent('Conteúdo editado');

    expect(note.contentHash).toBeUndefined();
    expect(note.sourceFileName).toBe('arquivo.txt');
    expect(note.toData().contentHash).toBeUndefined();
  });
});
