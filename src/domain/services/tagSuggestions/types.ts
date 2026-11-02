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

export interface ExtractedKeyword {
  term: string;
  score: number;
  source: string;
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

export interface ConsolidationContext {
  assignedTagNames: readonly string[];
  chainTagNames: readonly string[];
  availableTags: readonly ExistingTagReference[];
  acceptedKeys?: ReadonlySet<string> | undefined;
  dismissedKeys?: ReadonlySet<string> | undefined;
  limit?: number | undefined;
}

export interface ConsolidatedTagSuggestion {
  name: string;
  normalizedName: string;
  score: number;
  isNew: boolean;
  existingTagId?: string | undefined;
  sources: string[];
}
