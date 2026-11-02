import { beforeEach, describe, expect, it } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { showAppendToChainDialog } from '@presentation/components/AppendToChainDialog.js';

const chain: ChainSummaryDTO = {
  id: 'chain-1',
  displayTitle: 'Projeto principal',
  noteCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  tagIds: [],
  tags: [],
  headerExcerpt: '',
};

function typeSearch(value: string): HTMLInputElement {
  const search = document.querySelector<HTMLInputElement>(
    '[id^="append-chain-search-"]'
  )!;
  search.value = value;
  search.dispatchEvent(new Event('input', { bubbles: true }));
  return search;
}

describe('AppendToChainDialog — criar coleção', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('oferece criar com o texto digitado e retorna a nova coleção', async () => {
    const result = showAppendToChainDialog({ chains: [chain] });
    typeSearch('Nova ideia');

    const create = document.querySelector<HTMLButtonElement>('.save-chain-create');
    expect(create).not.toBeNull();
    expect(create?.textContent).toContain('Criar coleção');
    expect(create?.textContent).toContain('Nova ideia');

    create?.click();

    await expect(result).resolves.toEqual({
      chainId: null,
      chainTitle: 'Nova ideia',
      createTitle: 'Nova ideia',
    });
  });

  it('oculta criação quando existe correspondência exata', async () => {
    const result = showAppendToChainDialog({ chains: [chain] });
    typeSearch('projeto principal');

    expect(document.querySelector('.save-chain-create')).toBeNull();
    document
      .querySelector<HTMLButtonElement>('[id^="append-chain-confirm-"]')
      ?.click();

    await expect(result).resolves.toEqual({
      chainId: 'chain-1',
      chainTitle: 'Projeto principal',
    });
  });

  it('cria com Enter quando não há correspondência exata', async () => {
    const result = showAppendToChainDialog({ chains: [chain] });
    const search = typeSearch('Outra coleção');

    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    await expect(result).resolves.toEqual({
      chainId: null,
      chainTitle: 'Outra coleção',
      createTitle: 'Outra coleção',
    });
  });

  it('permite criar quando não existe nenhuma coleção', async () => {
    const result = showAppendToChainDialog({ chains: [] });
    const search = typeSearch('  Primeira coleção  ');

    expect(document.querySelector('.save-chain-create')).not.toBeNull();
    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );

    await expect(result).resolves.toEqual({
      chainId: null,
      chainTitle: 'Primeira coleção',
      createTitle: 'Primeira coleção',
    });
  });
});
