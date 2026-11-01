import { describe, expect, it } from 'vitest';
import {
  isNoteContentType,
  isVerbatimContentType,
  NOTE_CONTENT_TYPE_META,
  normalizeNoteContentType,
} from '@presentation/app/noteContentTypes.js';

describe('metadados de tipo de conteúdo', () => {
  it('expõe rótulos e modo verbatim dos três tipos', () => {
    expect(NOTE_CONTENT_TYPE_META.text.label).toBe('Texto');
    expect(NOTE_CONTENT_TYPE_META.code.label).toBe('Código');
    expect(NOTE_CONTENT_TYPE_META.markdown.label).toBe('Markdown');

    expect(isVerbatimContentType('text')).toBe(false);
    expect(isVerbatimContentType('code')).toBe(true);
    expect(isVerbatimContentType('markdown')).toBe(true);
  });

  it('normaliza tipos inválidos para texto', () => {
    expect(isNoteContentType('markdown')).toBe(true);
    expect(isNoteContentType('yaml')).toBe(false);
    expect(normalizeNoteContentType('markdown')).toBe('markdown');
    expect(normalizeNoteContentType('yaml')).toBe('text');
    expect(normalizeNoteContentType(undefined)).toBe('text');
  });
});
