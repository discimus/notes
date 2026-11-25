export interface PreprocessedToken {
  value: string;
  position: number;
  sentence: number;
}

export interface PreprocessedDocument {
  text: string;
  tokens: PreprocessedToken[];
  sentences: string[][];
}

export type SuggestionField = 'title' | 'content';

export interface ExtractedKeyword {
  term: string;
  score: number;
  source: string;
  field?: SuggestionField | undefined;
}

export interface TermWeightIndex {
  idf(term: string): number;
}

export interface ExtractionInput {
  document: PreprocessedDocument;
  corpus: PreprocessedDocument[];
  tfidfIndex?: TermWeightIndex | undefined;
  sourceFileName?: string | undefined;
}

export interface KeywordExtractor {
  readonly id: string;
  readonly weight: number;
  extract(input: ExtractionInput): ExtractedKeyword[];
}

export interface ExistingTagReference {
  id: string;
  name: string;
  normalizedName: string;
}

export interface TagSuggestionWeights {
  title: number;
  content: number;
  related: number;
  context: number;
}

export interface TagUsageStats {
  chainCount: number;
  noteCount: number;
  accepted: number;
  dismissed: number;
  manual: number;
}

export interface ScoreBreakdown {
  title: number;
  content: number;
  related: number;
  context: number;
}

export interface ConsolidationContext {
  assignedTagNames: readonly string[];
  chainTagNames: readonly string[];
  availableTags: readonly ExistingTagReference[];
  acceptedKeys?: ReadonlySet<string> | undefined;
  dismissedKeys?: ReadonlySet<string> | undefined;
  chainTitleTerms?: readonly string[] | undefined;
  relatedTermSupport?: ReadonlyMap<string, number> | undefined;
  siblingTagSupport?: ReadonlyMap<string, number> | undefined;
  tagUsage?: ReadonlyMap<string, TagUsageStats> | undefined;
  weights?: TagSuggestionWeights | undefined;
  limit?: number | undefined;
  maxNewTags?: number | undefined;
}

export interface ConsolidatedTagSuggestion {
  name: string;
  normalizedName: string;
  score: number;
  isNew: boolean;
  existingTagId?: string | undefined;
  sources: string[];
  reason?: string | undefined;
  breakdown?: ScoreBreakdown | undefined;
  isStandard?: boolean | undefined;
}
