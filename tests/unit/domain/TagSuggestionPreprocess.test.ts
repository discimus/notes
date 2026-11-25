import { describe, expect, it } from 'vitest';
import {
  deriveNoteTitle,
  preprocessContent,
  stripTitleFromContent,
} from '@domain/services/tagSuggestions/index.js';

describe('pré-processamento de tags', () => {
  it('normaliza acentos, plurais e expressões compostas', () => {
    const document = preprocessContent(
      'Domain Driven Design e Arquiteturas orientadas a eventos.'
    );
    const values = document.tokens.map((token) => token.value);

    expect(values).toContain('domain');
    expect(values).toContain('arquiteturas');
    expect(values).toContain('eventos');
  });

  it('deriva título apenas de título explícito ou heading', () => {
    expect(deriveNoteTitle('# Arquitetura limpa\n\nConteúdo', undefined)).toBe(
      'Arquitetura limpa'
    );
    expect(deriveNoteTitle('Primeira frase comum.', undefined)).toBeUndefined();
    expect(deriveNoteTitle('Conteúdo', 'Título explícito')).toBe(
      'Título explícito'
    );
  });

  it('remove do conteúdo o heading que virou título', () => {
    const content = '# Arquitetura\n\nDetalhes de DDD.';
    expect(stripTitleFromContent(content, 'Arquitetura')).toBe(
      '\nDetalhes de DDD.'
    );
    expect(stripTitleFromContent(content, 'Outro título')).toBe(content);
  });
});
