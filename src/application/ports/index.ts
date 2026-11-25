export type { INoteClassifier, TagSuggestion, ClassificationContext } from './INoteClassifier.js';
export { NullClassifier } from './INoteClassifier.js';
export { TAG_SUGGESTION_CACHE_TTL_MS } from './ITagSuggestionCache.js';
export type {
  CachedTagSuggestion,
  ITagSuggestionCache,
  TagSuggestionCacheEntry,
} from './ITagSuggestionCache.js';
export type {
  ITagSuggestionDecisions,
  NoteTagDecision,
  TagSuggestionDecisionKind,
} from './ITagSuggestionDecisions.js';
export type {
  ITagFeedbackStore,
  TagFeedbackKind,
  TagFeedbackMap,
  TagFeedbackRecord,
} from './ITagFeedbackStore.js';
