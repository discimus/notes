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
  headerExcerpt: 'Primeira nota',
};

describe('AppendToChainDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('pede a seleÃ§Ã£o de uma cadeia e retorna o destino', async () => {
    const result = showAppendToChainDialog({ chains: [chain] });

    expect(document.querySelector('.append-chain-dialog')).not.toBeNull();
    expect(
      document.querySelector<HTMLButtonElement>('[id^="append-chain-confirm-"]')
        ?.disabled
    ).toBe(true);

    document.querySelector<HTMLInputElement>('input[value="chain-1"]')?.click();
    document
      .querySelector<HTMLButtonElement>('[id^="append-chain-confirm-"]')
      ?.click();

    await expect(result).resolves.toEqual({
      chainId: 'chain-1',
      chainTitle: 'Projeto principal',
    });
  });

  it('filtra a lista pelo tÃ­tulo da cadeia', () => {
    showAppendToChainDialog({ chains: [chain] });

    const search = document.querySelector<HTMLInputElement>(
      '[id^="append-chain-search-"]'
    );
    if (!search) throw new Error('Busca nÃ£o encontrada');

    search.value = 'inexistente';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.querySelector('.save-chain-list__empty')?.textContent).toBe(
      'Nenhuma cadeia encontrada.'
    );
  });

  it('mantÃ©m o salvamento indisponÃ­vel sem cadeias', () => {
    showAppendToChainDialog({ chains: [] });

    expect(
      document.querySelector<HTMLButtonElement>('[id^="append-chain-confirm-"]')
        ?.disabled
    ).toBe(true);
    expect(document.querySelector('[id^="append-chain-status-"]')?.textContent).toContain(
      'Crie uma cadeia pela lateral'
    );
  });

  it('retorna null ao cancelar', async () => {
    const result = showAppendToChainDialog({ chains: [chain] });

    document
      .querySelector<HTMLButtonElement>('[id^="append-chain-cancel-"]')
      ?.click();

    await expect(result).resolves.toBeNull();
  });
});
