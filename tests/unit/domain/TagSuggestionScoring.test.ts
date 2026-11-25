import { describe, expect, it } from 'vitest';
import {
  scoreAndConsolidateSuggestions,
  type ConsolidationContext,
  type WeightedKeywords,
} from '@domain/services/tagSuggestions/index.js';

function context(
  overrides: Partial<ConsolidationContext> = {}
): ConsolidationContext {
  return {
    assignedTagNames: [],
    chainTagNames: [],
    availableTags: [],
    ...overrides,
  };
}

describe('pontuação de sugestões de tags', () => {
  it('separa os componentes de título e conteúdo', () => {
    const results: WeightedKeywords[] = [
      {
        id: 'yake',
        weight: 1,
        keywords: [
          { term: 'arquitetura', score: 1, source: 'yake', field: 'title' },
          { term: 'detalhes', score: 1, source: 'yake', field: 'content' },
        ],
      },
    ];

    const [suggestion] = scoreAndConsolidateSuggestions(
      results,
      context({ maxNewTags: 2 })
    );

    expect(suggestion?.normalizedName).toBe('arquitetura');
    expect(suggestion?.breakdown?.title).toBeGreaterThan(0);
    expect(suggestion?.breakdown?.content).toBe(0);
    expect(suggestion?.reason).toContain('Arquitetura');
  });

  it('usa suporte nas notas relacionadas e no contexto da coleção', () => {
    const results: WeightedKeywords[] = [
      {
        id: 'yake',
        weight: 1,
        keywords: [{ term: 'arquitetura', score: 1, source: 'yake' }],
      },
    ];
    const support = new Map([['arquitetura', 0.8]]);
    const siblingTags = new Map([['arquitetura', 0.6]]);

    const [suggestion] = scoreAndConsolidateSuggestions(
      results,
      context({
        chainTagNames: ['arquitetura'],
        relatedTermSupport: support,
        siblingTagSupport: siblingTags,
        maxNewTags: 2,
      })
    );

    expect(suggestion?.breakdown?.related).toBeGreaterThan(0.6);
    expect(suggestion?.breakdown?.context).toBe(1);
    expect(suggestion?.reason).toBeDefined();
  });

  it('favorece uma tag ampla do catálogo em vez de termos específicos', () => {
    const results: WeightedKeywords[] = [
      {
        id: 'yake',
        weight: 1,
        keywords: [
          { term: 'typescript', score: 1, source: 'yake' },
          { term: 'entity-framework', score: 1, source: 'yake' },
          { term: 'aspnet-core', score: 0.9, source: 'yake' },
        ],
      },
    ];

    const suggestions = scoreAndConsolidateSuggestions(
      results,
      context({ maxNewTags: 2 })
    );

    expect(suggestions[0]?.normalizedName).toBe('programacao');
    expect(suggestions[0]?.isStandard).toBe(true);
    expect(suggestions.filter((item) => item.isNew).length).toBeLessThanOrEqual(2);
  });

  it('reutiliza tag existente sem duplicar por variação', () => {
    const results: WeightedKeywords[] = [
      {
        id: 'yake',
        weight: 1,
        keywords: [
          { term: 'typescript', score: 1, source: 'yake' },
          { term: 'testes', score: 0.8, source: 'yake' },
        ],
      },
    ];

    const suggestions = scoreAndConsolidateSuggestions(
      results,
      context({
        availableTags: [
          { id: 'tag-1', name: 'TypeScript', normalizedName: 'typescript' },
        ],
        maxNewTags: 1,
      })
    );

    expect(suggestions[0]).toMatchObject({
      name: 'TypeScript',
      normalizedName: 'typescript',
      isNew: false,
      existingTagId: 'tag-1',
    });
    expect(
      suggestions.filter((item) => item.normalizedName === 'typescript')
    ).toHaveLength(1);
  });
});
