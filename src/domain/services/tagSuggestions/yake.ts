import { STOPWORDS } from './stopwords.js';
import type {
  ExtractedKeyword,
  ExtractionInput,
  KeywordExtractor,
  PreprocessedToken,
} from './types.js';

interface CandidateOccurrence {
  position: number;
  sentence: number;
}

interface CandidateStats {
  term: string;
  tokens: PreprocessedToken[];
  occurrences: CandidateOccurrence[];
}

const MAX_NGRAM_SIZE = 3;
const MAX_CANDIDATES = 32;
const SOURCE = 'yake';

function collectCandidates(input: ExtractionInput): CandidateStats[] {
  const map = new Map<string, CandidateStats>();
  const tokens = input.document.tokens;

  for (let start = 0; start < tokens.length; start += 1) {
    const sentence = tokens[start]?.sentence;
    if (sentence === undefined) continue;

    const words: string[] = [];
    const used: PreprocessedToken[] = [];

    for (let size = 1; size <= MAX_NGRAM_SIZE; size += 1) {
      const token = tokens[start + size - 1];
      if (!token || token.sentence !== sentence || STOPWORDS.has(token.value)) break;
      words.push(token.value);
      used.push(token);

      const term = words.join('-');
      const entry = map.get(term) ?? { term, tokens: [...used], occurrences: [] };
      entry.occurrences.push({ position: token.position, sentence: token.sentence });
      map.set(term, entry);
    }
  }

  return [...map.values()];
}

function relatedness(stats: CandidateStats, documentTokens: PreprocessedToken[]): number {
  const neighbors = new Set<string>();
  for (const occurrence of stats.occurrences) {
    const before = documentTokens[occurrence.position - 1];
    const after = documentTokens[occurrence.position + stats.tokens.length];
    if (before) neighbors.add(before.value);
    if (after) neighbors.add(after.value);
  }
  return neighbors.size / Math.max(1, stats.occurrences.length * 2);
}

function candidateScore(stats: CandidateStats, documentTokens: PreprocessedToken[]): number {
  const frequency = stats.occurrences.length;
  const firstPosition = stats.occurrences[0]?.position ?? documentTokens.length;
  const position = documentTokens.length > 0 ? firstPosition / documentTokens.length : 1;
  const sentenceSpread = new Set(stats.occurrences.map((item) => item.sentence)).size;
  const dispersion = Math.min(1, sentenceSpread / Math.max(1, frequency));
  const lengthPenalty = 1 + (stats.tokens.length - 1) * 0.15;
  const raw =
    (position * 0.32 +
      (1 / (1 + frequency)) * 0.3 +
      (1 - dispersion) * 0.2 +
      (1 - relatedness(stats, documentTokens)) * 0.18) *
    lengthPenalty;

  return 1 / (1 + raw);
}

export class YakeExtractor implements KeywordExtractor {
  readonly id = SOURCE;
  readonly weight = 0.55;

  extract(input: ExtractionInput): ExtractedKeyword[] {
    return collectCandidates(input)
      .map((stats) => ({
        term: stats.term,
        score: candidateScore(stats, input.document.tokens),
        source: SOURCE,
      }))
      .filter((candidate) => candidate.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);
  }
}
