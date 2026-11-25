import { canonicalTagKey } from './canonicalize.js';
import { consolidateSuggestions } from './consolidate.js';
import { SourceFileNameExtractor } from './fileName.js';
import { preprocessContent, stripTitleFromContent } from './preprocess.js';
import type {
  ConsolidatedTagSuggestion,
  ConsolidationContext,
  ExtractedKeyword,
  ExtractionInput,
  KeywordExtractor,
  PreprocessedDocument,
  TagUsageStats,
  TermWeightIndex,
} from './types.js';
import { TfIdfExtractor } from './tfidf.js';
import { YakeExtractor } from './yake.js';

export interface TagSuggestionPipelineInput {
  content: string;
  title?: string | undefined;
  sourceFileName?: string | undefined;
  corpus?: readonly PreprocessedDocument[] | undefined;
  tfidfIndex?: TermWeightIndex | undefined;
  chainTitle?: string | undefined;
  siblingTagSupport?: ReadonlyMap<string, number> | undefined;
  tagUsage?: ReadonlyMap<string, TagUsageStats> | undefined;
  context: ConsolidationContext;
}

const MAX_NGRAM_SIZE = 3;

function documentTermKeys(document: PreprocessedDocument): Set<string> {
  const keys = new Set<string>();
  const tokens = document.tokens;

  for (let start = 0; start < tokens.length; start += 1) {
    const sentence = tokens[start]?.sentence;
    if (sentence === undefined) continue;

    const words: string[] = [];
    for (let size = 1; size <= MAX_NGRAM_SIZE; size += 1) {
      const token = tokens[start + size - 1];
      if (!token || token.sentence !== sentence) break;
      words.push(token.value);
      const key = canonicalTagKey(words.join('-'));
      if (key) keys.add(key);
    }
  }

  return keys;
}

function relatedSupport(
  corpus: readonly PreprocessedDocument[],
  keys: Iterable<string>
): Map<string, number> {
  const support = new Map<string, number>();
  if (corpus.length === 0) return support;

  const documents = corpus.map(documentTermKeys);
  for (const key of keys) {
    let matches = 0;
    documents.forEach((terms) => {
      if (terms.has(key)) matches += 1;
    });
    support.set(key, matches / documents.length);
  }
  return support;
}

function withField(
  keywords: readonly ExtractedKeyword[],
  field: 'title' | 'content'
): ExtractedKeyword[] {
  return keywords.map((keyword) => ({ ...keyword, field }));
}

function chainTitleTerms(chainTitle: string | undefined): string[] {
  if (!chainTitle?.trim()) return [];
  return preprocessContent(chainTitle).tokens
    .map((token) => canonicalTagKey(token.value))
    .filter((value) => value.length > 0);
}

export class TagSuggestionPipeline {
  constructor(private readonly extractors: readonly KeywordExtractor[]) {}

  suggest(input: TagSuggestionPipelineInput): ConsolidatedTagSuggestion[] {
    const title = input.title?.trim();
    const body = title ? stripTitleFromContent(input.content, title) : input.content;
    const document = preprocessContent(body);
    const titleDocument = title ? preprocessContent(title) : null;
    const corpus = [...(input.corpus ?? [])];
    const extractionInput: ExtractionInput = {
      document,
      corpus,
      ...(input.tfidfIndex ? { tfidfIndex: input.tfidfIndex } : {}),
      ...(input.sourceFileName ? { sourceFileName: input.sourceFileName } : {}),
    };

    const results = this.extractors.map((extractor) => {
      const sourceField = extractor.id === 'filename' ? 'title' : 'content';
      const contentKeywords = withField(
        extractor.extract(extractionInput),
        sourceField
      );
      const titleKeywords =
        titleDocument && extractor.id !== 'filename'
          ? withField(
              extractor.extract({
                ...extractionInput,
                document: titleDocument,
              }),
              'title'
            )
          : [];
      return {
        id: extractor.id,
        weight: extractor.weight,
        keywords: [...contentKeywords, ...titleKeywords],
      };
    });

    const candidateKeys = new Set<string>();
    results.forEach((result) =>
      result.keywords.forEach((keyword) => {
        const key = canonicalTagKey(keyword.term);
        if (key) candidateKeys.add(key);
      })
    );

    const computedSupport = relatedSupport(corpus, candidateKeys);
    const context: ConsolidationContext = {
      ...input.context,
      ...(computedSupport.size > 0
        ? { relatedTermSupport: computedSupport }
        : {}),
      ...(input.siblingTagSupport
        ? { siblingTagSupport: input.siblingTagSupport }
        : {}),
      ...(input.tagUsage ? { tagUsage: input.tagUsage } : {}),
      chainTitleTerms: input.chainTitle
        ? chainTitleTerms(input.chainTitle)
        : (input.context.chainTitleTerms ?? []),
    };

    return consolidateSuggestions(results, context);
  }
}

export function createDefaultTagSuggestionPipeline(): TagSuggestionPipeline {
  return new TagSuggestionPipeline([
    new YakeExtractor(),
    new TfIdfExtractor(),
    new SourceFileNameExtractor(),
  ]);
}
