import type { StandardTagDTO, TagDTO } from '@application/dto/index.js';
import { normalizeText } from '@shared/utilities/index.js';

export const TAG_SUGGESTION_LIMIT = 6;

export interface TagSuggestionOption {
  id: string;
  name: string;
  normalizedName: string;
  chainCount: number;
  isStandard?: boolean | undefined;
}

function toOption(tag: TagDTO): TagSuggestionOption {
  return {
    id: tag.id,
    name: tag.name,
    normalizedName: tag.normalizedName,
    chainCount: tag.chainCount,
  };
}

function toStandardOption(tag: StandardTagDTO): TagSuggestionOption {
  return {
    id: tag.id,
    name: tag.name,
    normalizedName: normalizeText(tag.name),
    chainCount: 0,
    isStandard: true,
  };
}

export function filterTagSuggestions(
  allTags: TagDTO[],
  assignedTags: TagDTO[],
  query: string,
  limit = TAG_SUGGESTION_LIMIT,
  standardTags: readonly StandardTagDTO[] = []
): TagSuggestionOption[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const assigned = new Set(assignedTags.map((tag) => normalizeText(tag.name)));
  const existing = allTags
    .filter((tag) => {
      const normalizedName = normalizeText(tag.name);
      return (
        !assigned.has(normalizedName) &&
        normalizedName.startsWith(normalizedQuery)
      );
    })
    .map(toOption);
  const existingNames = new Set(existing.map((tag) => normalizeText(tag.name)));
  const standard = standardTags
    .filter((tag) => {
      const normalizedName = normalizeText(tag.name);
      return (
        !assigned.has(normalizedName) &&
        !existingNames.has(normalizedName) &&
        normalizedName.startsWith(normalizedQuery)
      );
    })
    .map(toStandardOption);

  return [...existing, ...standard]
    .sort((a, b) => {
      const normalizedA = normalizeText(a.name);
      const normalizedB = normalizeText(b.name);
      const exactA = normalizedA === normalizedQuery;
      const exactB = normalizedB === normalizedQuery;

      if (exactA !== exactB) return exactA ? -1 : 1;
      if (Boolean(a.isStandard) !== Boolean(b.isStandard)) {
        return a.isStandard ? 1 : -1;
      }
      if (a.chainCount !== b.chainCount) return b.chainCount - a.chainCount;
      return a.name.localeCompare(b.name, 'pt-BR');
    })
    .slice(0, limit);
}
