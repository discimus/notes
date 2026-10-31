import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { renderNavDrawer, updateNavDrawer } from '@presentation/views/nav.js';

describe('configurações na navegação', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    appState.set({ view: 'chains', drawerOpen: true, theme: 'system' });
    document.body.appendChild(renderNavDrawer());
    updateNavDrawer(appState.get());
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
  });

  it('expõe a engrenagem no rodapé e abre o diálogo', () => {
    const settings = document.querySelector<HTMLButtonElement>(
      '.nav-drawer__footer #settings-toggle'
    );

    expect(settings).not.toBeNull();
    expect(settings?.classList.contains('nav-item')).toBe(false);
    expect(settings?.getAttribute('aria-label')).toBe('Configurações');
    expect(settings?.getAttribute('title')).toBe('Configurações');
    expect(settings?.getAttribute('aria-haspopup')).toBe('dialog');

    settings?.click();
    expect(document.querySelector('#settings-dialog')).not.toBeNull();
  });
});
