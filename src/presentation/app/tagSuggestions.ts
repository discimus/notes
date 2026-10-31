import type { TagDTO } from '@application/dto/index.js';
import { normalizeText } from '@shared/utilities/index.js';

export const TAG_SUGGESTION_LIMIT = 6;

export function filterTagSuggestions(
  allTags: TagDTO[],
  assignedTags: TagDTO[],
  query: string,
  limit = TAG_SUGGESTION_LIMIT
): TagDTO[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const assigned = new Set(assignedTags.map((tag) => normalizeText(tag.name)));

  return allTags
    .filter((tag) => {
      const normalizedName = normalizeText(tag.name);
      return (
        !assigned.has(normalizedName) &&
        normalizedName.startsWith(normalizedQuery)
      );
    })
    .sort((a, b) => {
      const normalizedA = normalizeText(a.name);
      const normalizedB = normalizeText(b.name);
      const exactA = normalizedA === normalizedQuery;
      const exactB = normalizedB === normalizedQuery;

      if (exactA !== exactB) return exactA ? -1 : 1;
      if (a.chainCount !== b.chainCount) return b.chainCount - a.chainCount;
      return a.name.localeCompare(b.name, 'pt-BR');
    })
    .slice(0, limit);
}
