import { beforeEach, describe, expect, it } from 'vitest';
import {
  getPinnedChainIds,
  initPinnedChains,
  togglePinnedChain,
} from '@presentation/app/pinnedChains.js';
import { appState } from '@presentation/state/AppState.js';

describe('cadeias fixadas', () => {
  beforeEach(() => {
    localStorage.clear();
    appState.set({ pinnedChainIds: [] });
  });

  it('inicia sem pins e persiste a alternância', () => {
    expect(getPinnedChainIds()).toEqual([]);

    expect(togglePinnedChain('chain-1')).toBe(true);
    expect(getPinnedChainIds()).toEqual(['chain-1']);
    expect(appState.get().pinnedChainIds).toEqual(['chain-1']);

    expect(togglePinnedChain('chain-1')).toBe(false);
    expect(getPinnedChainIds()).toEqual([]);
  });

  it('inicializa o AppState e ignora dados inválidos', () => {
    localStorage.setItem('threadnotes.pinned-chains', JSON.stringify(['chain-1', 2, 'chain-1']));
    initPinnedChains();
    expect(appState.get().pinnedChainIds).toEqual(['chain-1']);

    localStorage.setItem('threadnotes.pinned-chains', '{inválido');
    initPinnedChains();
    expect(appState.get().pinnedChainIds).toEqual([]);
  });
});
