import { describe, expect, it } from 'vitest';
import {
  AUTO_FILE_NAME_WORDS,
  asciiFileNameSlug,
  buildNoteFileName,
  noteFileTimestamp,
  uniqueFileName,
} from '@shared/utilities/index.js';

describe('nome automático de arquivo', () => {
  const timestamp = new Date(2026, 0, 2, 14, 30, 0);

  it('formata yyMMddhh com data local', () => {
    expect(noteFileTimestamp(timestamp)).toBe('26010214');
  });

  it('converte as primeiras palavras para ASCII', () => {
    expect(asciiFileNameSlug('Ação rápida — coração & café')).toBe(
      'acao-rapida-coracao-cafe'
    );
  });

  it('limita a quantidade de palavras e evita slug vazio', () => {
    const slug = asciiFileNameSlug('um dois três quatro cinco seis');
    expect(slug.split('-')).toHaveLength(AUTO_FILE_NAME_WORDS);
    expect(asciiFileNameSlug('###')).toBe('nota');
  });

  it('monta o nome com timestamp, slug e extensão', () => {
    expect(
      buildNoteFileName({
        content: 'Título com acentuação e símbolos',
        extension: 'md',
        timestamp,
      })
    ).toBe('26010214-titulo-com-acentuacao-e.md');
  });

  it('adiciona sufixos numéricos quando o nome já existe', () => {
    expect(uniqueFileName('nota.txt', new Set())).toBe('nota.txt');
    expect(uniqueFileName('nota.txt', new Set(['nota.txt']))).toBe('nota-02.txt');
    expect(
      uniqueFileName('nota.txt', new Set(['nota.txt', 'nota-02.txt']))
    ).toBe('nota-03.txt');
    expect(uniqueFileName('README', new Set(['readme']))).toBe('README-02');
  });
});
