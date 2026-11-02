import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initGlobalShortcuts } from '@presentation/app/shortcuts.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';
import { editorStore } from '@presentation/state/EditorStore.js';

let cleanup: (() => void) | null = null;

function resetTabs(): void {
  editorStore.getSnapshot().tabs.forEach((tab) => editorStore.closeTab(tab.id));
}

function pressN(): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
      cancelable: true,
    })
  );
}

describe('atalho N dentro de uma coleção', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
    resetTabs();
    appState.set({
      view: 'editor',
      selectedChainId: null,
      currentChain: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    resetTabs();
    document.body.innerHTML = '';
  });

  it('abre o compositor da coleção em vez do editor global', () => {
    const chainTab = editorStore.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });
    cleanup = initGlobalShortcuts();

    pressN();

    const active = editorStore.getActiveTab();
    expect(active?.kind).toBe('chain');
    expect(active?.id).toBe(chainTab.id);
    if (active?.kind !== 'chain') throw new Error('Aba de coleção esperada.');
    expect(active.composerCollapsed).toBe(false);
    expect(active.noteTabs).toHaveLength(1);
    expect(editorStore.getSnapshot().tabs.some((tab) => tab.kind === 'draft')).toBe(
      false
    );
  });

  it('abre o compositor da coleção selecionada na view de detalhe', async () => {
    const chainTab = editorStore.openChainTab('chain-1', 'Projeto', {
      composerCollapsed: true,
    });
    appState.set({
      view: 'chain-detail',
      selectedChainId: 'chain-1',
      currentChain: null,
    });
    const openChain = vi
      .spyOn(AppController, 'openChainInEditor')
      .mockResolvedValue(chainTab.id);
    cleanup = initGlobalShortcuts();

    pressN();

    await vi.waitFor(() => {
      expect(openChain).toHaveBeenCalledWith('chain-1');
      const active = editorStore.getActiveTab();
      expect(active?.kind).toBe('chain');
      if (active?.kind === 'chain') {
        expect(active.composerCollapsed).toBe(false);
        expect(active.noteTabs).toHaveLength(1);
      }
    });
    expect(editorStore.getSnapshot().tabs.some((tab) => tab.kind === 'draft')).toBe(
      false
    );
  });
});
