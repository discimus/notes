import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderChainsLayout } from '@presentation/views/chains.js';

function chain(id: string, title: string): ChainSummaryDTO {
  return {
    id,
    displayTitle: title,
    noteCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
  };
}

function renderState(
  bulkMode: boolean,
  selection: string[] = []
): HTMLElement {
  const state = {
    ...appState.get(),
    view: 'chains' as const,
    chainSummaries: [chain('chain-1', 'Projeto'), chain('chain-2', 'Rotina')],
    selectedChainId: null,
    chainsBulkMode: bulkMode,
    chainsBulkSelection: selection,
    chainFilterQuery: '',
  };
  appState.set(state);
  return renderChainsLayout(state);
}

describe('seleção em massa de coleções', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('ativa o modo de seleção pelo toolbar', () => {
    const enter = vi
      .spyOn(AppController, 'enterChainsBulkMode')
      .mockImplementation(() => undefined);
    const layout = renderState(false);

    const select = layout.querySelector<HTMLButtonElement>(
      '[aria-label="Selecionar coleções"]'
    );
    expect(select?.textContent?.trim()).toBe('checklist');
    expect(select?.getAttribute('aria-pressed')).toBe('false');
    select?.click();

    expect(enter).toHaveBeenCalledTimes(1);
  });

  it('permite marcar coleções e executar ações em lote', () => {
    const toggle = vi
      .spyOn(AppController, 'toggleChainSelection')
      .mockImplementation(() => undefined);
    const archive = vi
      .spyOn(AppController, 'archiveSelectedChains')
      .mockResolvedValue(undefined);
    const remove = vi
      .spyOn(AppController, 'deleteSelectedChains')
      .mockResolvedValue(undefined);
    const open = vi.spyOn(AppController, 'openChainInEditor');
    const layout = renderState(true, ['chain-2']);

    const first = layout.querySelector<HTMLElement>('[data-chain-id="chain-1"]');
    const second = layout.querySelector<HTMLElement>('[data-chain-id="chain-2"]');

    expect(first?.getAttribute('aria-selected')).toBe('false');
    expect(second?.getAttribute('aria-selected')).toBe('true');
    expect(second?.querySelector('.chain-item__select')?.textContent).toBe(
      'check_box'
    );

    const select = layout.querySelector<HTMLButtonElement>(
      '[aria-label="Cancelar seleção de coleções"]'
    );
    expect(select?.getAttribute('aria-pressed')).toBe('true');
    expect(
      select?.querySelector('.material-symbols-rounded')?.textContent
    ).toBe('close');

    first?.click();
    expect(toggle).toHaveBeenCalledWith('chain-1');
    expect(open).not.toHaveBeenCalled();

    layout
      .querySelector<HTMLButtonElement>(
        '[aria-label="Arquivar coleções selecionadas"]'
      )
      ?.click();
    layout
      .querySelector<HTMLButtonElement>(
        '[aria-label="Excluir coleções selecionadas"]'
      )
      ?.click();

    expect(archive).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('desabilita ações sem seleção e permite cancelar pelo mesmo botão', () => {
    const exit = vi
      .spyOn(AppController, 'exitChainsBulkMode')
      .mockImplementation(() => undefined);
    const layout = renderState(true, []);

    expect(
      layout.querySelector<HTMLButtonElement>(
        '[aria-label="Arquivar coleções selecionadas"]'
      )?.disabled
    ).toBe(true);
    expect(
      layout.querySelector<HTMLButtonElement>(
        '[aria-label="Excluir coleções selecionadas"]'
      )?.disabled
    ).toBe(true);

    layout
      .querySelector<HTMLButtonElement>(
        '[aria-label="Cancelar seleção de coleções"]'
      )
      ?.click();
    expect(exit).toHaveBeenCalledTimes(1);
  });
});
