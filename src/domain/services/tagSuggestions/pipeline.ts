import { consolidateSuggestions } from './consolidate.js';
import { preprocessContent } from './preprocess.js';
import type {
  ConsolidatedTagSuggestion,
  ConsolidationContext,
  ExtractionInput,
  KeywordExtractor,
  PreprocessedDocument,
  TermWeightIndex,
} from './types.js';
import { TfIdfExtractor } from './tfidf.js';
import { YakeExtractor } from './yake.js';

export interface TagSuggestionPipelineInput {
  content: string;
  corpus?: readonly PreprocessedDocument[] | undefined;
  tfidfIndex?: TermWeightIndex | undefined;
  context: ConsolidationContext;
}

export class TagSuggestionPipeline {
  constructor(private readonly extractors: readonly KeywordExtractor[]) {}

  suggest(input: TagSuggestionPipelineInput): ConsolidatedTagSuggestion[] {
    const document = preprocessContent(input.content);
    const extractionInput: ExtractionInput = {
      document,
      corpus: [...(input.corpus ?? [])],
      ...(input.tfidfIndex ? { tfidfIndex: input.tfidfIndex } : {}),
    };
    const results = this.extractors.map((extractor) => ({
      id: extractor.id,
      weight: extractor.weight,
      keywords: extractor.extract(extractionInput),
    }));

    return consolidateSuggestions(results, input.context);
  }
}

export function createDefaultTagSuggestionPipeline(): TagSuggestionPipeline {
  return new TagSuggestionPipeline([new YakeExtractor(), new TfIdfExtractor()]);
}
