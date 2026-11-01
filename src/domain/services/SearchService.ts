import type { Chain } from '../entities/index.js';
import type { Tag } from '../entities/index.js';
import { normalizeText, excerpt } from '@shared/utilities/index.js';

export interface SearchResult {
  noteId: string;
  chainId: string;
  chainTitle: string;
  snippet: string;
  noteContent: string;
  noteCreatedAt: string;
  noteRole: string;
  matchType: 'content' | 'title' | 'tag';
  score: number;
}

export interface SearchRankInput {
  noteId: string;
  chainId: string;
  chainTitle: string;
  content: string;
  title?: string | undefined;
  noteCreatedAt: string;
  noteRole: string;
  chainTagMatch: boolean;
  noteTagMatch: boolean;
}

export function rankSearchResult(
  normalizedQuery: string,
  input: SearchRankInput
): SearchResult | null {
  const normalizedContent = normalizeText(input.content);
  const normalizedTitle = input.title ? normalizeText(input.title) : '';

  let score = 0;
  let matchType: SearchResult['matchType'] = 'content';

  if (normalizedTitle.includes(normalizedQuery)) {
    score += 3;
    matchType = 'title';
  }
  if (normalizedContent.includes(normalizedQuery)) {
    score += 2;
    matchType = matchType === 'title' ? 'title' : 'content';
  }
  if (input.chainTagMatch) {
    score += 1;
    matchType = score === 1 ? 'tag' : matchType;
  }
  if (input.noteTagMatch) {
    score += 1;
    matchType = score === 1 ? 'tag' : matchType;
  }

  if (score === 0) return null;

  return {
    noteId: input.noteId,
    chainId: input.chainId,
    chainTitle: input.chainTitle,
    snippet: excerpt(input.content, 150),
    noteContent: input.content,
    noteCreatedAt: input.noteCreatedAt,
    noteRole: input.noteRole,
    matchType,
    score,
  };
}

/**
 * ServiA�o de domA-nio: SearchService.
 * Pesquisa textual sobre notas, tA-tulos e tags.
 * DeterminA-stico e sem dependA�ncias externas.
 */
export class SearchService {
  search(
    query: string,
    chains: Chain[],
    tagsByChainId: Map<string, Tag[]>,
    tagsByNoteId: Map<string, Tag[]> = new Map()
  ): SearchResult[] {
    if (!query.trim()) return [];

    const normalizedQuery = normalizeText(query);
    const results: SearchResult[] = [];

    for (const chain of chains) {
      if (chain.isDeleted()) continue;

      const chainTags = tagsByChainId.get(chain.id) ?? [];
      const chainTagMatch = chainTags.some((tag) =>
        tag.name.normalized.includes(normalizedQuery)
      );

      for (const note of chain.notes) {
        const noteTagMatch = (tagsByNoteId.get(note.id) ?? []).some((tag) =>
          tag.name.normalized.includes(normalizedQuery)
        );
        const result = rankSearchResult(normalizedQuery, {
          noteId: note.id,
          chainId: chain.id,
          chainTitle: chain.displayTitle,
          content: note.content,
          ...(note.title ? { title: note.title } : {}),
          noteCreatedAt: note.createdAt,
          noteRole: note.role,
          chainTagMatch: chainTagMatch && note.isHeader(),
          noteTagMatch,
        });
        if (result) results.push(result);
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
