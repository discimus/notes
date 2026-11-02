import { normalizeText } from '@shared/utilities/index.js';

const MAX_TAG_LENGTH = 50;

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ss') || word.endsWith('is') || word.endsWith('us')) return word;
  if (word.endsWith('oes') || word.endsWith('aes')) return `${word.slice(0, -3)}ao`;
  if (word.endsWith('ns')) return `${word.slice(0, -2)}m`;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function canonicalTagKey(name: string): string {
  return normalizeText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
    .map(singularize)
    .join('-');
}

export function tagNameFromTerm(term: string): string {
  const key = canonicalTagKey(term);
  if (key.length <= MAX_TAG_LENGTH) return key;

  const words = key.split('-');
  const selected: string[] = [];
  for (const word of words) {
    const candidate = [...selected, word].join('-');
    if (candidate.length > MAX_TAG_LENGTH) break;
    selected.push(word);
  }
  return selected.join('-');
}
