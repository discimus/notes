import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import type { AppState } from '@presentation/state/AppState.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import {
  renderTrashLayout,
  updateTrashLayout,
} from '@presentation/views/trash.js';

function chain(overrides: Partial<ChainSummaryDTO> = {}): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto Alpha',
    noteCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: '2026-03-04T12:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    ...overrides,
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...appState.get(),
    view: 'trash',
    chainSummaries: [chain(), chain({ id: 'chain-2', displayTitle: 'Rotina' })],
    chainFilterQuery: '',
    isLoading: false,
    ...overrides,
  };
}

describe('Lixeira', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renderiza uma view própria de gerenciamento, sem editor ou detalhe', () => {
    const layout = renderTrashLayout(makeState());

    expect(layout.classList.contains('trash-layout')).toBe(true);
    expect(layout.querySelector('.chains-layout')).toBeNull();
    expect(layout.querySelector('.detail-panel')).toBeNull();
    expect(layout.querySelector('#trash-count')?.textContent).toBe('2 coleções');
    expect(layout.querySelectorAll('.trash-item')).toHaveLength(2);
    expect(layout.querySelector('.trash-item__meta')?.textContent).toContain(
      '2 notas'
    );
    expect(layout.querySelector('.trash-item__meta')?.textContent).toContain(
      'Excluída em'
    );
  });

  it('permite restaurar e excluir permanentemente sem abrir o editor', () => {
    const restore = vi
      .spyOn(AppController, 'restoreFromTrash')
      .mockResolvedValue(undefined);
    const remove = vi
      .spyOn(AppController, 'permanentDelete')
      .mockResolvedValue(undefined);
    const openEditor = vi.spyOn(AppController, 'openChainInEditor');
    const openDetail = vi.spyOn(AppController, 'openChain');
    const layout = renderTrashLayout(makeState());

    layout
      .querySelector<HTMLButtonElement>('[aria-label="Restaurar coleção Projeto Alpha"]')
      ?.click();
    layout
      .querySelector<HTMLButtonElement>(
        '[aria-label="Excluir permanentemente Projeto Alpha"]'
      )
      ?.click();

    expect(restore).toHaveBeenCalledWith('chain-1');
    expect(remove).toHaveBeenCalledWith('chain-1');
    expect(openEditor).not.toHaveBeenCalled();
    expect(openDetail).not.toHaveBeenCalled();
  });

  it('filtra a lista e exibe estado vazio', () => {
    const layout = renderTrashLayout(makeState({ chainFilterQuery: 'rotina' }));
    expect(layout.querySelectorAll('.trash-item')).toHaveLength(1);
    expect(layout.querySelector('.trash-item__title')?.textContent).toBe('Rotina');

    updateTrashLayout(
      layout,
      makeState({ chainFilterQuery: '', chainSummaries: [] })
    );
    expect(layout.querySelector('.trash-item')).toBeNull();
    expect(layout.textContent).toContain('Lixeira vazia');
  });
});
