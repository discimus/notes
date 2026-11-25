import { beforeEach, describe, expect, it } from 'vitest';
import type { TagSuggestionCacheEntry } from '@application/ports/ITagSuggestionCache.js';
import {
  LocalTagSuggestionCache,
  TAG_SUGGESTION_CACHE_KEY,
  TAG_SUGGESTION_CACHE_KEY_V1,
} from '@infrastructure/persistence/LocalTagSuggestionCache.js';

function entry(): TagSuggestionCacheEntry {
  return {
    noteId: 'note-1',
    signature: 'sig',
    suggestions: [
      {
        name: 'typescript',
        normalizedName: 'typescript',
        score: 0.9,
        sources: ['yake'],
      },
    ],
    acceptedKeys: [],
    dismissedKeys: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
}

describe('migração do cache de sugestões', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lê entradas antigas da chave v1', () => {
    localStorage.setItem(
      TAG_SUGGESTION_CACHE_KEY_V1,
      JSON.stringify({ 'note-1': entry() })
    );

    const cache = new LocalTagSuggestionCache();
    expect(cache.load('note-1')?.suggestions[0]?.normalizedName).toBe(
      'typescript'
    );
  });

  it('persiste a versão nova sem remover o cache em memória', () => {
    const cache = new LocalTagSuggestionCache();
    cache.save({
      ...entry(),
      contextSignature: 'ctx',
      algorithmVersion: 2,
      catalogVersion: 1,
      weightsVersion: 1,
    });

    const restored = new LocalTagSuggestionCache();
    expect(restored.load('note-1')?.contextSignature).toBe('ctx');
    expect(localStorage.getItem(TAG_SUGGESTION_CACHE_KEY)).toBeTruthy();
  });
});
