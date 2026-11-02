import { describe, expect, it } from 'vitest';
import {
  canonicalTagKey,
  consolidateSuggestions,
  preprocessContent,
  TagSuggestionPipeline,
  TfIdfExtractor,
  TfIdfIndex,
  YakeExtractor,
} from '@domain/services/tagSuggestions/index.js';

describe('pipeline de sugestões de tags', () => {
  it('pré-processa conteúdo removendo markdown, URLs e stopwords', () => {
    const document = preprocessContent(
      '# Título\n\nVeja [a documentação](https://example.com) sobre TypeScript e testes.'
    );
    const values = document.tokens.map((token) => token.value);

    expect(values).toContain('typescript');
    expect(values).toContain('testes');
    expect(values).not.toContain('https');
    expect(values).not.toContain('sobre');
  });

  it('executa YAKE e TF-IDF como extratores independentes', () => {
    const yake = new YakeExtractor();
    const tfidf = new TfIdfExtractor();
    const document = preprocessContent(
      'TypeScript melhora a segurança. TypeScript reduz erros nos testes automatizados.'
    );
    const other = preprocessContent('Coleção sobre receitas de cozinha.');

    const yakeTerms = yake
      .extract({ document, corpus: [document, other] })
      .map((item) => item.term);
    const index = new TfIdfIndex();
    index.upsert('a', 'a', document);
    index.upsert('b', 'b', other);
    const tfidfTerms = tfidf
      .extract({ document, corpus: [document, other], tfidfIndex: index })
      .map((item) => item.term);

    expect(yakeTerms).toContain('typescript');
    expect(tfidfTerms).toContain('typescript');
  });

  it('consolida resultados, deduplica variações e prioriza tags existentes', () => {
    const pipeline = new TagSuggestionPipeline([
      {
        id: 'fake',
        weight: 1,
        extract: () => [
          { term: 'typescript', score: 1, source: 'fake' },
          { term: 'testes', score: 0.8, source: 'fake' },
          { term: 'teste', score: 0.6, source: 'fake' },
        ],
      },
    ]);

    const suggestions = pipeline.suggest({
      content: 'TypeScript e testes',
      context: {
        assignedTagNames: [],
        chainTagNames: [],
        availableTags: [
          { id: 'tag-1', name: 'TypeScript', normalizedName: 'typescript' },
        ],
        limit: 5,
      },
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({
      name: 'TypeScript',
      existingTagId: 'tag-1',
      isNew: false,
    });
    expect(canonicalTagKey('testes')).toBe(canonicalTagKey('teste'));
  });

  it('remove tags atribuídas, aceitas e descartadas', () => {
    const suggestions = consolidateSuggestions(
      [
        {
          id: 'fake',
          weight: 1,
          keywords: [
            { term: 'typescript', score: 1, source: 'fake' },
            { term: 'testes', score: 0.7, source: 'fake' },
            { term: 'seguranca', score: 0.5, source: 'fake' },
          ],
        },
      ],
      {
        assignedTagNames: ['typescript'],
        chainTagNames: [],
        availableTags: [],
        acceptedKeys: new Set(['testes']),
        dismissedKeys: new Set(['seguranca']),
      }
    );

    expect(suggestions).toEqual([]);
  });
});
