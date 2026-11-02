import { beforeEach, describe, expect, it } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';

describe('toggleAllChainsBulkSelection', () => {
  beforeEach(() => {
    appState.set({ chainsBulkMode: true, chainsBulkSelection: [] });
  });

  it('seleciona todas as coleções visíveis', () => {
    AppController.toggleAllChainsBulkSelection(['a', 'b']);
    expect(appState.get().chainsBulkSelection).toEqual(['a', 'b']);
  });

  it('desmarca todas quando todas as visíveis já estão selecionadas', () => {
    AppController.toggleAllChainsBulkSelection(['a', 'b']);
    AppController.toggleAllChainsBulkSelection(['a', 'b']);
    expect(appState.get().chainsBulkSelection).toEqual([]);
  });

  it('preserva seleções fora do filtro visível', () => {
    appState.set({ chainsBulkSelection: ['c'] });
    AppController.toggleAllChainsBulkSelection(['a', 'b']);
    expect(appState.get().chainsBulkSelection).toEqual(['c', 'a', 'b']);
    AppController.toggleAllChainsBulkSelection(['a', 'b']);
    expect(appState.get().chainsBulkSelection).toEqual(['c']);
  });

  it('não altera nada fora do modo de seleção', () => {
    appState.set({ chainsBulkMode: false, chainsBulkSelection: [] });
    AppController.toggleAllChainsBulkSelection(['a']);
    expect(appState.get().chainsBulkSelection).toEqual([]);
  });
});
