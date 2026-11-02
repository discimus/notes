import { beforeEach, describe, expect, it } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { renderChainsLayout } from '@presentation/views/chains.js';
import type { ChainSummaryDTO, TagDTO } from '@application/dto/index.js';

function makeTag(name: string): TagDTO {
  return {
    id: `tag-${name}`,
    name,
    normalizedName: name.toLowerCase(),
    createdAt: '2026-01-01T00:00:00.000Z',
    origin: 'manual',
    chainCount: 1,
  };
}

function makeChain(overrides: Partial<ChainSummaryDTO> = {}): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto Alpha',
    noteCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: 'Primeira ideia',
    ...overrides,
  };
}

function renderList(chains: ChainSummaryDTO[], selectedChainId: string | null = null): HTMLElement {
  const layout = renderChainsLayout({
    ...appState.get(),
    view: 'chains',
    chainSummaries: chains,
    selectedChainId,
    chainFilterQuery: '',
  });
  document.body.appendChild(layout);
  return layout;
}

describe('lista compacta de coleções', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exibe tÃ­tulo e data/notas sem excerpt ou tags', () => {
    const layout = renderList([
      makeChain({ tags: [makeTag('Trabalho')] }),
      makeChain({ id: 'chain-2', displayTitle: 'Rotina' }),
    ]);

    const items = [...layout.querySelectorAll<HTMLElement>('.chain-item')];
    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(first.querySelector('.chain-item__title')?.textContent).toBe('Projeto Alpha');
    expect(first.querySelector('.chain-item__meta')?.textContent).toContain('2 notas');
    expect(first.textContent).not.toContain('Primeira ideia');
    expect(first.querySelector('.chain-item__tag')).toBeNull();
    expect(first.title).toBe('Projeto Alpha');
    expect(items[1]?.getAttribute('aria-label')).toBe('Coleção: Rotina');
  });

  it('marca o item selecionado e expÃµe o estado acessÃ­vel', () => {
    const layout = renderList(
      [makeChain(), makeChain({ id: 'chain-2', displayTitle: 'Rotina' })],
      'chain-2'
    );

    const first = layout.querySelector<HTMLElement>('[data-chain-id="chain-1"]');
    const second = layout.querySelector<HTMLElement>('[data-chain-id="chain-2"]');

    expect(first?.classList.contains('chain-item--active')).toBe(false);
    expect(first?.getAttribute('aria-current')).toBe('false');
    expect(second?.classList.contains('chain-item--active')).toBe(true);
    expect(second?.getAttribute('aria-current')).toBe('true');
  });
});
