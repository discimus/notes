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

describe('AppendToChainDialog em modo mover', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('usa textos de movimento e não permite criar coleção', () => {
    showAppendToChainDialog({
      chains: [chain],
      allowCreate: false,
      title: 'Mover notas',
      description: 'Escolha a coleção de destino das notas selecionadas.',
      confirmLabel: 'Mover',
    });

    expect(document.querySelector('.dialog__title')?.textContent).toBe(
      'Mover notas'
    );
    expect(
      document.querySelector<HTMLButtonElement>(
        '[id^="append-chain-confirm-"]'
      )?.textContent
    ).toBe('Mover');

    const search = document.querySelector<HTMLInputElement>(
      '[id^="append-chain-search-"]'
    )!;
    search.value = 'Outra coleção';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.querySelector('.save-chain-create')).toBeNull();
  });
});
