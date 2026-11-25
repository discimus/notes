import type { TagSuggestionWeights } from './types.js';

export const ALGORITHM_VERSION = 2;
export const WEIGHTS_VERSION = 1;

export const DEFAULT_SUGGESTION_WEIGHTS: TagSuggestionWeights = Object.freeze({
  title: 0.35,
  content: 0.35,
  related: 0.2,
  context: 0.1,
});

export const DEFAULT_SUGGESTION_LIMIT = 5;
export const DEFAULT_MAX_NEW_TAGS = 2;
export const DEFAULT_MAX_CONTEXT_NOTES = 200;
