import { describe, expect, it } from 'vitest';
import { findMatchRange } from '@shared/utilities/index.js';

describe('findMatchRange', () => {
  it('retorna o intervalo original mesmo com acentos', () => {
    const text = 'Linha inicial\nRevisão do código';
    const range = findMatchRange(text, 'revisao');

    expect(range).not.toBeNull();
    expect(text.slice(range!.start, range!.end)).toBe('Revisão');
  });

  it('retorna o intervalo original com espaços repetidos', () => {
    const text = 'foo   bar final';
    const range = findMatchRange(text, 'foo bar');

    expect(range).not.toBeNull();
    expect(text.slice(range!.start, range!.end)).toBe('foo   bar');
  });

  it('retorna null quando o termo não existe', () => {
    expect(findMatchRange('Conteúdo', 'ausente')).toBeNull();
  });
});
