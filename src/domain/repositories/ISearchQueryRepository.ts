import type { UUID } from '@shared/types/index.js';
import type { SearchResult } from '../services/SearchService.js';

export interface SearchPageQuery {
  query: string;
  tagChainIds?: UUID[] | undefined;
  tagNoteIds?: UUID[] | undefined;
  offset: number;
  limit: number;
}

export interface SearchPageResult {
  results: SearchResult[];
  hasMore: boolean;
}

export interface ISearchQueryRepository {
  searchNotesPage(query: SearchPageQuery): Promise<SearchPageResult>;
}
