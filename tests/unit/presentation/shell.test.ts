import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from '@presentation/pages/render.js';
import { appState } from '@presentation/state/AppState.js';

describe('renderApp', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    appState.set({
      view: 'chains',
      selectedChainId: null,
      chainSummaries: [],
      currentChain: null,
      chainFilterQuery: '',
      drawerOpen: false,
      isLoading: false,
      error: null,
    });
  });

  it('monta shell, navegação, conteúdo e FAB sem topbar', () => {
    const root = document.getElementById('app') as HTMLElement;

    renderApp(root);

    expect(root.querySelector('.app-shell')).not.toBeNull();
    expect(root.querySelector('#nav-drawer')).not.toBeNull();
    expect(root.querySelector('#app-topbar')).toBeNull();
    expect(root.querySelector('#app-view-title')?.textContent).toBe(
      'Todas as coleções'
    );
    expect(root.querySelector('.nav-toggle')).not.toBeNull();
    expect(root.querySelector('#app-content')).not.toBeNull();
    expect(root.querySelector('#fab-new-chain')).not.toBeNull();
  });
});
