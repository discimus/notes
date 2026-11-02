import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderArchiveLayout } from '@presentation/views/archive.js';
import { renderTrashLayout } from '@presentation/views/trash.js';

function chain(id: string, title: string): ChainSummaryDTO {
  return {
    id,
    displayTitle: title,
    noteCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: '2026-01-03T00:00:00.000Z',
    deletedAt: '2026-01-04T00:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
  };
}

function state(
  view: 'archived' | 'trash',
  bulkMode: boolean,
  selection: string[] = []
) {
  return {
    ...appState.get(),
    view,
    chainSummaries: [chain('chain-1', 'Projeto'), chain('chain-2', 'Rotina')],
    chainsBulkMode: bulkMode,
    chainsBulkSelection: selection,
    chainFilterQuery: '',
    isLoading: false,
  };
}

describe('seletor de coleções no Arquivo e Lixeira', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.spyOn(AppController, 'enterChainsBulkMode').mockImplementation(
      () => undefined
    );
    vi.spyOn(AppController, 'exitChainsBulkMode').mockImplementation(
      () => undefined
    );
    vi.spyOn(AppController, 'toggleChainSelection').mockImplementation(
      () => undefined
    );
    vi.spyOn(AppController, 'toggleAllChainsBulkSelection').mockImplementation(
      () => undefined
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('ativa o modo de seleção no Arquivo', () => {
    const layout = renderArchiveLayout(state('archived', false));
    layout.querySelector<HTMLButtonElement>('#archive-bulk-toggle')?.click();
    expect(AppController.enterChainsBulkMode).toHaveBeenCalledTimes(1);
  });

  it('seleciona todas e executa ações no Arquivo', () => {
    const restore = vi
      .spyOn(AppController, 'restoreSelectedArchivedChains')
      .mockResolvedValue(undefined);
    const moveToTrash = vi
      .spyOn(AppController, 'moveSelectedArchivedToTrash')
      .mockResolvedValue(undefined);
    const layout = renderArchiveLayout(state('archived', true, ['chain-1']));

    const selectAll = layout.querySelector<HTMLInputElement>(
      '#archive-bulk-all'
    )!;
    expect(selectAll.indeterminate).toBe(true);
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change', { bubbles: true }));
    expect(AppController.toggleAllChainsBulkSelection).toHaveBeenCalledWith([
      'chain-1',
      'chain-2',
    ]);

    layout.querySelector<HTMLElement>('[data-chain-id="chain-2"]')?.click();
    expect(AppController.toggleChainSelection).toHaveBeenCalledWith('chain-2');

    expect(
      layout.querySelector('[data-chain-id="chain-1"] .archive-item__restore')
    ).toBeNull();

    layout.querySelector<HTMLButtonElement>('#archive-bulk-restore')?.click();
    layout.querySelector<HTMLButtonElement>('#archive-bulk-trash')?.click();
    expect(restore).toHaveBeenCalledTimes(1);
    expect(moveToTrash).toHaveBeenCalledTimes(1);
  });

  it('seleciona todas e executa ações na Lixeira', () => {
    const restore = vi
      .spyOn(AppController, 'restoreSelectedTrashChains')
      .mockResolvedValue(undefined);
    const permanentDelete = vi
      .spyOn(AppController, 'permanentDeleteSelectedChains')
      .mockResolvedValue(undefined);
    const layout = renderTrashLayout(state('trash', true, ['chain-1']));

    const selectAll = layout.querySelector<HTMLInputElement>(
      '#trash-bulk-all'
    )!;
    expect(selectAll.checked).toBe(false);
    expect(selectAll.indeterminate).toBe(true);
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change', { bubbles: true }));
    expect(AppController.toggleAllChainsBulkSelection).toHaveBeenCalledWith([
      'chain-1',
      'chain-2',
    ]);

    layout.querySelector<HTMLButtonElement>('#trash-bulk-restore')?.click();
    layout.querySelector<HTMLButtonElement>('#trash-bulk-delete')?.click();
    expect(restore).toHaveBeenCalledTimes(1);
    expect(permanentDelete).toHaveBeenCalledTimes(1);
  });
});
