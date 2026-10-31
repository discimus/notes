import { describe, expect, it } from 'vitest';
import type { TagDTO } from '@application/dto/index.js';
import { filterTagSuggestions } from '@presentation/app/tagSuggestions.js';

function makeTag(id: string, name: string, chainCount = 1): TagDTO {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    createdAt: '2026-01-01T00:00:00.000Z',
    origin: 'manual',
    chainCount,
  };
}

describe('filterTagSuggestions', () => {
  it('filtra por prefixo normalizado e prioriza correspondência exata', () => {
    const result = filterTagSuggestions(
      [
        makeTag('1', 'Projeto', 8),
        makeTag('2', 'Projetos antigos', 2),
        makeTag('3', 'Pessoal', 10),
      ],
      [],
      'projeto'
    );

    expect(result.map((tag) => tag.name)).toEqual([
      'Projeto',
      'Projetos antigos',
    ]);
  });

  it('exclui tags já associadas e respeita o limite', () => {
    const allTags = Array.from({ length: 8 }, (_, index) =>
      makeTag(String(index), `Tag ${index}`)
    );

    const result = filterTagSuggestions(allTags, [allTags[0]!], 'tag', 3);

    expect(result).toHaveLength(3);
    expect(result.map((tag) => tag.id)).not.toContain('0');
  });

  it('não retorna sugestões para query vazia', () => {
    expect(filterTagSuggestions([makeTag('1', 'Projeto')], [], '   ')).toEqual([]);
  });
});
