export { canonicalTagKey, tagNameFromTerm } from './canonicalize.js';
export { consolidateSuggestions } from './consolidate.js';
export type { WeightedKeywords } from './consolidate.js';
export { createDefaultTagSuggestionPipeline, TagSuggestionPipeline } from './pipeline.js';
export { documentSignature, preprocessContent } from './preprocess.js';
export { TfIdfExtractor, TfIdfIndex } from './tfidf.js';
export { YakeExtractor } from './yake.js';
export type {
  ConsolidatedTagSuggestion,
  ConsolidationContext,
  ExistingTagReference,
  ExtractedKeyword,
  ExtractionInput,
  KeywordExtractor,
  PreprocessedDocument,
  PreprocessedToken,
  TermWeightIndex,
} from './types.js';
