import { preprocessContent } from './preprocess.js';
import type {
  ExtractedKeyword,
  ExtractionInput,
  KeywordExtractor,
  PreprocessedDocument,
  PreprocessedToken,
} from './types.js';

const MAX_NGRAM_SIZE = 2;
const MAX_CANDIDATES = 24;
const SOURCE = 'filename';

interface FileNamePhrase {
  term: string;
  tokens: PreprocessedToken[];
  count: number;
}

function fileBasename(fileName: string): string {
  const normalized = fileName.trim().replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

export function preprocessSourceFileName(
  fileName: string
): PreprocessedDocument {
  const withoutExtension = fileBasename(fileName).replace(
    /\.[a-z0-9]{1,10}$/i,
    ''
  );
  const separated = withoutExtension
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim();

  return separated.length > 0
    ? preprocessContent(separated)
    : { text: '', tokens: [], sentences: [] };
}

function collectPhrases(document: PreprocessedDocument): FileNamePhrase[] {
  const map = new Map<string, FileNamePhrase>();
  const tokens = document.tokens;

  for (let start = 0; start < tokens.length; start += 1) {
    const sentence = tokens[start]?.sentence;
    if (sentence === undefined) continue;

    const words: string[] = [];
    const used: PreprocessedToken[] = [];
    for (let size = 1; size <= MAX_NGRAM_SIZE; size += 1) {
      const token = tokens[start + size - 1];
      if (!token || token.sentence !== sentence) break;
      words.push(token.value);
      used.push(token);

      const term = words.join('-');
      const entry = map.get(term) ?? {
        term,
        tokens: [...used],
        count: 0,
      };
      entry.count += 1;
      map.set(term, entry);
    }
  }

  return [...map.values()];
}

export class SourceFileNameExtractor implements KeywordExtractor {
  readonly id = SOURCE;
  readonly weight = 0.6;

  extract(input: ExtractionInput): ExtractedKeyword[] {
    if (!input.sourceFileName?.trim()) return [];

    const document = preprocessSourceFileName(input.sourceFileName);
    const tokenCount = document.tokens.length;
    if (tokenCount === 0) return [];

    const scored = collectPhrases(document).map((phrase) => {
      const termFrequency = phrase.count / tokenCount;
      const lengthBonus = 1 + (phrase.tokens.length - 1) * 0.06;
      return {
        term: phrase.term,
        score: termFrequency * lengthBonus,
        source: SOURCE,
      };
    });

    const maxScore = scored.reduce(
      (max, candidate) => Math.max(max, candidate.score),
      0
    );
    if (maxScore <= 0) return [];

    return scored
      .map((candidate) => ({
        ...candidate,
        score: candidate.score / maxScore,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);
  }
}
