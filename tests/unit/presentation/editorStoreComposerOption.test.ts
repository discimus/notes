import { beforeEach, describe, expect, it } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';

describe('EditorStore composer option', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('abre a coleção com o compositor recolhido quando solicitado', () => {
    const store = new EditorStore();
    const tab = store.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });

    expect(tab.composerCollapsed).toBe(true);
  });
});
