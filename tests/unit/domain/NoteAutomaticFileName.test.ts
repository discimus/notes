import { describe, expect, it } from 'vitest';
import { Chain, Note } from '@domain/entities/index.js';
import { noteFileTimestamp } from '@shared/utilities/index.js';

const localDate = new Date(2026, 0, 2, 14, 30, 0);
const createdAt = localDate.toISOString();
const prefix = noteFileTimestamp(localDate);

describe('nome automático de arquivo da Note', () => {
  const chainId = 'chain-001';

  it('gera nome com timestamp, primeiras palavras ASCII e .txt para texto', () => {
    const note = Note.createTail({
      content: 'Ação rápida com coração',
      chainId,
      position: 1,
      createdAt,
    });

    expect(note.sourceFileName).toBe(`${prefix}-acao-rapida-com-coracao.txt`);
  });

  it('usa .txt para código e .md para markdown', () => {
    const code = Note.createTail({
      content: 'const valor = 1;',
      chainId,
      position: 1,
      contentType: 'code',
      createdAt,
    });
    const markdown = Note.createTail({
      content: '# Título da nota',
      chainId,
      position: 2,
      contentType: 'markdown',
      createdAt,
    });

    expect(code.sourceFileName?.endsWith('.txt')).toBe(true);
    expect(markdown.sourceFileName?.endsWith('.md')).toBe(true);
  });

  it('preserva o nome original em notas importadas', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const note = chain.appendImportedText('Conteúdo', createdAt, {
      sourceFileName: 'arquivo-original.md',
    });

    expect(note.sourceFileName).toBe('arquivo-original.md');
  });

  it('adiciona sufixo quando outro arquivo da coleção tem o mesmo nome', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const first = chain.appendImportedText('Conteúdo A', createdAt, {
      sourceFileName: 'nota.txt',
    });
    const second = chain.appendImportedText('Conteúdo B', createdAt, {
      sourceFileName: 'nota.txt',
    });
    const third = chain.appendImportedText('Conteúdo C', createdAt, {
      sourceFileName: 'nota.txt',
    });

    expect(first.sourceFileName).toBe('nota.txt');
    expect(second.sourceFileName).toBe('nota-02.txt');
    expect(third.sourceFileName).toBe('nota-03.txt');
  });

  it('adiciona sufixo em nomes automáticos repetidos', () => {
    const chain = Chain.create({ title: 'Coleção' });
    const first = chain.appendImportedText('Mesmo conteúdo', createdAt);
    const second = chain.appendImportedText('Mesmo conteúdo', createdAt);

    expect(first.sourceFileName?.endsWith('.txt')).toBe(true);
    expect(second.sourceFileName).toBe(
      first.sourceFileName?.replace('.txt', '-02.txt')
    );
  });

  it('atualiza a extensão automática ao alterar o tipo', () => {
    const note = Note.createTail({
      content: '# Título',
      chainId,
      position: 1,
      createdAt,
    });

    expect(note.sourceFileName?.endsWith('.txt')).toBe(true);
    note.updateContentType('markdown');
    expect(note.sourceFileName?.endsWith('.md')).toBe(true);
  });
});
