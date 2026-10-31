import type { Chain } from '../entities/index.js';
import type { Tag } from '../entities/index.js';
import { normalizeText, excerpt } from '../../shared/utilities/index.js';

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

/**
 * Serviço de domínio: SearchService.
 * Pesquisa textual sobre notas, títulos e tags.
 * Determinístico e sem dependências externas.
 */
export class SearchService {
  search(
    query: string,
    chains: Chain[],
    tagsByChainId: Map<string, Tag[]>
  ): SearchResult[] {
    if (!query.trim()) return [];

    const normalizedQuery = normalizeText(query);
    const results: SearchResult[] = [];

    for (const chain of chains) {
      if (chain.isDeleted()) continue;

      const chainTags = tagsByChainId.get(chain.id) ?? [];

      // Busca em tags da cadeia
      const tagMatch = chainTags.some((t) =>
        t.name.normalized.includes(normalizedQuery)
      );

      for (const note of chain.notes) {
        const normalizedContent = normalizeText(note.content);
        const normalizedTitle = note.title ? normalizeText(note.title) : '';

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
        if (tagMatch && note.isHeader()) {
          score += 1;
          matchType = score === 1 ? 'tag' : matchType;
        }

        if (score === 0) continue;

        results.push({
          noteId: note.id,
          chainId: chain.id,
          chainTitle: chain.displayTitle,
          snippet: excerpt(note.content, 150),
          noteContent: note.content,
          noteCreatedAt: note.createdAt,
          noteRole: note.role,
          matchType,
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
