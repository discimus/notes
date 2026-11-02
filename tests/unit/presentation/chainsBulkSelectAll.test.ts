import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  selection: string[] = [],
  chainFilterQuery = ''
): HTMLElement {
  const state = {
    ...appState.get(),
    view: 'chains' as const,
    chainSummaries: [chain('chain-1', 'Projeto'), chain('chain-2', 'Rotina')],
    selectedChainId: null,
    chainsBulkMode: true,
    chainsBulkSelection: selection,
    chainFilterQuery,
  };
  appState.set(state);
  return renderChainsLayout(state);
}

describe('selecionar todas as coleções no painel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('encaminha todas as coleções visíveis', () => {
    const toggleAll = vi
      .spyOn(AppController, 'toggleAllChainsBulkSelection')
      .mockImplementation(() => undefined);
    const layout = renderState();

    const input = layout.querySelector<HTMLInputElement>('#chains-bulk-all')!;
    expect(input.checked).toBe(false);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(toggleAll).toHaveBeenCalledWith(['chain-1', 'chain-2']);
  });

  it('reflete estado marcado e indeterminado', () => {
    const all = renderState(['chain-1', 'chain-2']);
    expect(
      all.querySelector<HTMLInputElement>('#chains-bulk-all')?.checked
    ).toBe(true);

    const partial = renderState(['chain-1']);
    const input = partial.querySelector<HTMLInputElement>('#chains-bulk-all')!;
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
  });

  it('considera apenas as coleções do filtro atual', () => {
    const toggleAll = vi
      .spyOn(AppController, 'toggleAllChainsBulkSelection')
      .mockImplementation(() => undefined);
    const layout = renderState([], 'Projeto');

    const input = layout.querySelector<HTMLInputElement>('#chains-bulk-all')!;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(toggleAll).toHaveBeenCalledWith(['chain-1']);
  });
});
