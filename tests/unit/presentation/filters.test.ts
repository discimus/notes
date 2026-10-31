import { describe, expect, it } from 'vitest';
import { filterChains } from '@presentation/filters.js';
import type { ChainSummaryDTO } from '@application/dto/index.js';

function makeChain(overrides: Partial<ChainSummaryDTO> = {}): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto Alpha',
    noteCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isFavorite: false,
    tagIds: [],
    tags: [],
    headerExcerpt: 'Primeira ideia',
    ...overrides,
  };
}

describe('filterChains', () => {
  it('retorna todas as cadeias quando a consulta está vazia', () => {
    const chains = [makeChain(), makeChain({ id: 'chain-2', displayTitle: 'Outra' })];

    expect(filterChains(chains, '')).toHaveLength(2);
  });

  it('filtra por título ignorando caixa e acentos', () => {
    const chains = [makeChain(), makeChain({ id: 'chain-2', displayTitle: 'Rotina' })];

    expect(filterChains(chains, 'projeto')).toHaveLength(1);
    expect(filterChains(chains, 'PROJETO')).toHaveLength(1);
  });

  it('filtra por trecho do header', () => {
    const chains = [makeChain(), makeChain({ id: 'chain-2', headerExcerpt: 'Outro assunto' })];

    expect(filterChains(chains, 'primeira ideia')).toHaveLength(1);
  });

  it('filtra por tag', () => {
    const chains = [
      makeChain({
        tags: [{
          id: 'tag-1',
          name: 'Trabalho',
          normalizedName: 'trabalho',
          createdAt: '2026-01-01T00:00:00.000Z',
          origin: 'manual',
          chainCount: 1,
        }],
      }),
      makeChain({ id: 'chain-2', displayTitle: 'Pessoal' }),
    ];

    expect(filterChains(chains, 'trabalho')).toHaveLength(1);
  });
});
