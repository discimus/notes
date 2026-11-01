import { describe, expect, it } from 'vitest';
import { findLinks } from '@shared/utilities/index.js';

describe('findLinks — delimitadores de código', () => {
  it('remove backticks ao redor de URLs', () => {
    const segments = findLinks('`https://example.com` e `www.example.com`');
    const links = segments.filter((segment) => segment.type === 'link');

    expect(links.map((link) => link.value)).toEqual([
      'https://example.com',
      'www.example.com',
    ]);
    expect(segments.map((segment) => segment.value).join('')).toBe(
      '`https://example.com` e `www.example.com`'
    );
  });
});
