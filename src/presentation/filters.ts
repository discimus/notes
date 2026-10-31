import type { ChainSummaryDTO } from '@application/dto/index.js';
import { normalizeText } from '@shared/utilities/index.js';

export function filterChains(chains: ChainSummaryDTO[], query: string): ChainSummaryDTO[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return chains;

  return chains.filter((chain) => {
    const searchable = [
      chain.displayTitle,
      chain.headerExcerpt,
      ...chain.tags.map((tag) => tag.name),
    ].join(' ');
    return normalizeText(searchable).includes(normalizedQuery);
  });
}
