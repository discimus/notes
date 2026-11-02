import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import type { AppState } from '@presentation/state/AppState.js';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import {
  renderArchiveLayout,
  updateArchiveLayout,
} from '@presentation/views/archive.js';

function chain(overrides: Partial<ChainSummaryDTO> = {}): ChainSummaryDTO {
  return {
    id: 'chain-1',
    displayTitle: 'Projeto Alpha',
    noteCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    archivedAt: '2026-03-04T12:00:00.000Z',
    tagIds: [],
    tags: [],
    headerExcerpt: '',
    ...overrides,
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...appState.get(),
    view: 'archived',
    chainSummaries: [chain(), chain({ id: 'chain-2', displayTitle: 'Rotina' })],
    chainFilterQuery: '',
    isLoading: false,
    ...overrides,
  };
}

describe('Arquivo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renderiza uma view própria de gerenciamento, sem editor ou detalhe', () => {
    const layout = renderArchiveLayout(makeState());

    expect(layout.classList.contains('archive-layout')).toBe(true);
    expect(layout.querySelector('.chains-layout')).toBeNull();
    expect(layout.querySelector('.detail-panel')).toBeNull();
    expect(layout.querySelector('#archive-count')?.textContent).toBe('2 coleções');
    expect(layout.querySelectorAll('.archive-item')).toHaveLength(2);
    expect(layout.querySelector('.archive-item__meta')?.textContent).toContain(
      '2 notas'
    );
    expect(layout.querySelector('.archive-item__meta')?.textContent).toContain(
      'Arquivada em'
    );
  });

  it('permite restaurar e mover para a lixeira sem abrir o editor', () => {
    const restore = vi
      .spyOn(AppController, 'restoreChain')
      .mockResolvedValue(undefined);
    const move = vi
      .spyOn(AppController, 'moveArchivedToTrash')
      .mockResolvedValue(undefined);
    const openEditor = vi.spyOn(AppController, 'openChainInEditor');
    const openDetail = vi.spyOn(AppController, 'openChain');
    const layout = renderArchiveLayout(makeState());

    layout
      .querySelector<HTMLButtonElement>('[aria-label="Restaurar coleção Projeto Alpha"]')
      ?.click();
    layout
      .querySelector<HTMLButtonElement>(
        '[aria-label="Mover coleção Projeto Alpha para a lixeira"]'
      )
      ?.click();

    expect(restore).toHaveBeenCalledWith('chain-1');
    expect(move).toHaveBeenCalledWith('chain-1');
    expect(openEditor).not.toHaveBeenCalled();
    expect(openDetail).not.toHaveBeenCalled();
  });

  it('filtra a lista e exibe estado vazio', () => {
    const layout = renderArchiveLayout(makeState({ chainFilterQuery: 'rotina' }));
    expect(layout.querySelectorAll('.archive-item')).toHaveLength(1);
    expect(layout.querySelector('.archive-item__title')?.textContent).toBe('Rotina');

    updateArchiveLayout(
      layout,
      makeState({ chainFilterQuery: '', chainSummaries: [] })
    );
    expect(layout.querySelector('.archive-item')).toBeNull();
    expect(layout.textContent).toContain('Nenhuma coleção arquivada');
  });
});
