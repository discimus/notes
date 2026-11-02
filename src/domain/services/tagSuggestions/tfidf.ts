import { STOPWORDS } from './stopwords.js';
import type {
  ExtractedKeyword,
  ExtractionInput,
  KeywordExtractor,
  PreprocessedDocument,
  PreprocessedToken,
  TermWeightIndex,
} from './types.js';

interface IndexedDocument {
  signature: string;
  termCounts: Map<string, number>;
  tokenCount: number;
}

interface PhraseStats {
  term: string;
  tokens: string[];
  count: number;
}

const SOURCE = 'tfidf';
const MAX_NGRAM_SIZE = 3;
const MAX_CANDIDATES = 32;

function termCounts(tokens: PreprocessedToken[]): Map<string, number> {
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    counts.set(token.value, (counts.get(token.value) ?? 0) + 1);
  });
  return counts;
}

export class TfIdfIndex implements TermWeightIndex {
  private readonly documents = new Map<string, IndexedDocument>();
  private readonly documentFrequency = new Map<string, number>();

  upsert(noteId: string, signature: string, document: PreprocessedDocument): boolean {
    const existing = this.documents.get(noteId);
    if (existing?.signature === signature) return false;

    if (existing) this.remove(noteId);

    const counts = termCounts(document.tokens);
    counts.forEach((_count, term) => {
      this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
    });
    this.documents.set(noteId, {
      signature,
      termCounts: counts,
      tokenCount: Math.max(1, document.tokens.length),
    });
    return true;
  }

  remove(noteId: string): void {
    const existing = this.documents.get(noteId);
    if (!existing) return;

    existing.termCounts.forEach((_count, term) => {
      const next = (this.documentFrequency.get(term) ?? 1) - 1;
      if (next <= 0) this.documentFrequency.delete(term);
      else this.documentFrequency.set(term, next);
    });
    this.documents.delete(noteId);
  }

  idf(term: string): number {
    const total = this.documents.size;
    const frequency = this.documentFrequency.get(term) ?? 0;
    return Math.log((total + 1) / (frequency + 1)) + 1;
  }

  hasSignature(noteId: string, signature: string): boolean {
    return this.documents.get(noteId)?.signature === signature;
  }

  hasStaleDocuments(validNoteIds: ReadonlySet<string>): boolean {
    return [...this.documents.keys()].some((noteId) => !validNoteIds.has(noteId));
  }

  retain(noteIds: ReadonlySet<string>): void {
    for (const noteId of [...this.documents.keys()]) {
      if (!noteIds.has(noteId)) this.remove(noteId);
    }
  }
}

function collectPhrases(document: PreprocessedDocument): PhraseStats[] {
  const map = new Map<string, PhraseStats>();
  const tokens = document.tokens;

  for (let start = 0; start < tokens.length; start += 1) {
    const sentence = tokens[start]?.sentence;
    if (sentence === undefined) continue;

    const words: string[] = [];
    for (let size = 1; size <= MAX_NGRAM_SIZE; size += 1) {
      const token = tokens[start + size - 1];
      if (!token || token.sentence !== sentence || STOPWORDS.has(token.value)) break;
      words.push(token.value);
      const term = words.join('-');
      const entry = map.get(term) ?? { term, tokens: [...words], count: 0 };
      entry.count += 1;
      map.set(term, entry);
    }
  }

  return [...map.values()];
}

function temporaryIndex(document: PreprocessedDocument): TfIdfIndex {
  const index = new TfIdfIndex();
  index.upsert('document', 'temporary', document);
  return index;
}

export class TfIdfExtractor implements KeywordExtractor {
  readonly id = SOURCE;
  readonly weight = 0.45;

  extract(input: ExtractionInput): ExtractedKeyword[] {
    const index = input.tfidfIndex ?? temporaryIndex(input.document);
    const tokenCount = Math.max(1, input.document.tokens.length);
    const scored = collectPhrases(input.document).map((phrase) => {
      const termFrequency = phrase.count / tokenCount;
      const averageIdf =
        phrase.tokens.reduce((sum, token) => sum + index.idf(token), 0) /
        Math.max(1, phrase.tokens.length);
      const lengthBonus = 1 + (phrase.tokens.length - 1) * 0.04;
      return {
        term: phrase.term,
        score: termFrequency * averageIdf * lengthBonus,
        source: SOURCE,
      };
    });

    const maxScore = scored.reduce((max, candidate) => Math.max(max, candidate.score), 0);
    if (maxScore <= 0) return [];

    return scored
      .map((candidate) => ({ ...candidate, score: candidate.score / maxScore }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);
  }
}
