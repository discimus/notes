export {
  CATALOG_VERSION,
  affinityKeys,
  findStandardTagForTerm,
  isStandardTagKey,
  standardTagByKey,
  standardTagKeys,
  STANDARD_TAGS,
} from './catalog.js';
export type {
  StandardTagAffinity,
  StandardTagDefinition,
} from './catalog.js';
export { canonicalTagKey, tagNameFromTerm } from './canonicalize.js';
export {
  ALGORITHM_VERSION,
  DEFAULT_MAX_CONTEXT_NOTES,
  DEFAULT_MAX_NEW_TAGS,
  DEFAULT_SUGGESTION_LIMIT,
  DEFAULT_SUGGESTION_WEIGHTS,
  WEIGHTS_VERSION,
} from './config.js';
export { consolidateSuggestions } from './consolidate.js';
export type { WeightedKeywords } from './consolidate.js';
export {
  preprocessSourceFileName,
  SourceFileNameExtractor,
} from './fileName.js';
export { createDefaultTagSuggestionPipeline, TagSuggestionPipeline } from './pipeline.js';
export type { TagSuggestionPipelineInput } from './pipeline.js';
export {
  deriveNoteTitle,
  documentSignature,
  preprocessContent,
  stripTitleFromContent,
} from './preprocess.js';
export { scoreAndConsolidateSuggestions } from './scoring.js';
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
  ScoreBreakdown,
  SuggestionField,
  TagSuggestionWeights,
  TagUsageStats,
  TermWeightIndex,
} from './types.js';
