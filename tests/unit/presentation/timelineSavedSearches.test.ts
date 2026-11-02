import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteTimelineSearch,
  getSavedTimelineSearches,
  saveTimelineSearch,
} from '@presentation/app/timelineSavedSearches.js';

describe('Buscas salvas da timeline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('salva, normaliza e remove buscas', () => {
    const saved = saveTimelineSearch(
      '  Código recente  ',
      {
        query: 'bug',
        from: '2026-01-01',
        to: '',
        tagIds: ['tag-1'],
        contentTypes: ['code'],
        tagMode: 'all',
        sort: 'relevance',
      },
      ['chain-1', 'chain-1']
    );

    expect(saved?.name).toBe('Código recente');
    expect(saved?.chainIds).toEqual(['chain-1']);

    const items = getSavedTimelineSearches();
    expect(items).toHaveLength(1);
    expect(items[0]?.filters.sort).toBe('relevance');

    deleteTimelineSearch(saved!.id);
    expect(getSavedTimelineSearches()).toEqual([]);
  });

  it('substitui busca com o mesmo nome e ignora nome vazio', () => {
    saveTimelineSearch('Minha busca', {
      query: 'a',
      from: '',
      to: '',
      tagIds: [],
      contentTypes: [],
      tagMode: 'any',
      sort: 'newest',
    }, []);
    saveTimelineSearch('Minha busca', {
      query: 'b',
      from: '',
      to: '',
      tagIds: [],
      contentTypes: [],
      tagMode: 'any',
      sort: 'oldest',
    }, []);

    const items = getSavedTimelineSearches();
    expect(items).toHaveLength(1);
    expect(items[0]?.filters.query).toBe('b');
    expect(saveTimelineSearch('   ', items[0]!.filters, [])).toBeNull();
  });
});
