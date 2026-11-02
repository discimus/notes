import { normalizeText } from '@shared/utilities/index.js';
import { STOPWORDS } from './stopwords.js';
import type { PreprocessedDocument, PreprocessedToken } from './types.js';

const MAX_CONTENT_LENGTH = 20_000;
const MIN_TOKEN_LENGTH = 2;

function cleanContent(content: string): string {
  return content
    .slice(0, MAX_CONTENT_LENGTH)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/www\.\S+/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~|{}[\]()]+/g, ' ')
    .replace(/\r?\n/g, '. ');
}

function normalizeToken(value: string): string {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, '');
  return normalized.length >= MIN_TOKEN_LENGTH ? normalized : '';
}

export function preprocessContent(content: string): PreprocessedDocument {
  const cleaned = cleanContent(content);
  const sentences: string[][] = [];
  const tokens: PreprocessedToken[] = [];

  cleaned.split(/[.!?;\n]+/).forEach((sentence) => {
    const values = sentence
      .split(/\s+/)
      .map(normalizeToken)
      .filter((value) => value.length > 0 && !STOPWORDS.has(value) && !/^\d+$/.test(value));

    if (values.length === 0) return;

    const sentenceIndex = sentences.length;
    values.forEach((value) => {
      tokens.push({
        value,
        position: tokens.length,
        sentence: sentenceIndex,
      });
    });
    sentences.push(values);
  });

  return {
    text: tokens.map((token) => token.value).join(' '),
    tokens,
    sentences,
  };
}

export function documentSignature(content: string, contentType: string | undefined): string {
  let hash = 2166136261;
  const input = `${contentType ?? 'text'}\u0000${content}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${input.length}:${(hash >>> 0).toString(36)}`;
}
