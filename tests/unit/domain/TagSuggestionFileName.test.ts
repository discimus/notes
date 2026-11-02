import { describe, expect, it } from 'vitest';
import {
  consolidateSuggestions,
  createDefaultTagSuggestionPipeline,
  documentSignature,
  preprocessSourceFileName,
  SourceFileNameExtractor,
} from '@domain/services/tagSuggestions/index.js';
import type { WeightedKeywords } from '@domain/services/tagSuggestions/index.js';

function context() {
  return {
    assignedTagNames: [],
    chainTagNames: [],
    availableTags: [],
  };
}

describe('sugestões de tags por nome de arquivo', () => {
  it('normaliza separadores, camelCase e remove extensão e timestamp', () => {
    expect(
      preprocessSourceFileName('MeuRelatorio-Final_v2.md').tokens.map(
        (token) => token.value
      )
    ).toEqual(['relatorio', 'final', 'v2']);

    expect(
      preprocessSourceFileName('26110218-26110218-typescript.txt').tokens.map(
        (token) => token.value
      )
    ).toEqual(['typescript']);

    expect(
      preprocessSourceFileName('XMLParser-Notes.md').tokens.map(
        (token) => token.value
      )
    ).toEqual(['xml', 'parser', 'notes']);
  });

  it('sugere termos presentes apenas no nome do arquivo', () => {
    const pipeline = new SourceFileNameExtractor();
    const keywords = pipeline.extract({
      document: { text: '', tokens: [], sentences: [] },
      corpus: [],
      sourceFileName: 'relatorio-typescript.md',
    });

    expect(keywords.map((keyword) => keyword.term)).toEqual(
      expect.arrayContaining(['relatorio', 'typescript'])
    );
  });

  it('usa o nome do arquivo no pipeline padrão', () => {
    const pipeline = createDefaultTagSuggestionPipeline();
    const suggestions = pipeline.suggest({
      content: 'texto comum sobre assuntos gerais',
      sourceFileName: 'relatorio-typescript.md',
      context: context(),
    });

    expect(suggestions.map((suggestion) => suggestion.normalizedName)).toEqual(
      expect.arrayContaining(['relatorio', 'typescript'])
    );
    expect(
      suggestions
        .find((suggestion) => suggestion.normalizedName === 'typescript')
        ?.sources.includes('filename')
    ).toBe(true);
  });

  it('dá boost para candidatos do nome do arquivo e desempata por eles', () => {
    const results: WeightedKeywords[] = [
      {
        id: 'content',
        weight: 1,
        keywords: [
          { term: 'alpha', score: 1, source: 'content' },
          { term: 'beta', score: 0.5, source: 'content' },
        ],
      },
      {
        id: 'filename',
        weight: 1,
        keywords: [
          { term: 'gamma', score: 1, source: 'filename' },
          { term: 'delta', score: 0.5, source: 'filename' },
        ],
      },
    ];

    const suggestions = consolidateSuggestions(results, {
      ...context(),
      limit: 10,
    });
    const scores = new Map(
      suggestions.map((suggestion) => [
        suggestion.normalizedName,
        suggestion.score,
      ])
    );

    expect(scores.get('delta')).toBeGreaterThan(scores.get('beta') ?? 0);
    expect(suggestions[0]?.normalizedName).toBe('gamma');
  });

  it('invalida a assinatura quando apenas o nome do arquivo muda', () => {
    const first = documentSignature('conteudo', 'text', 'a.txt');
    const second = documentSignature('conteudo', 'text', 'b.txt');
    expect(first).not.toBe(second);
  });
});
