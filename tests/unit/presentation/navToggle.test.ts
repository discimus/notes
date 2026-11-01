import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import {
  renderNavToggle,
  syncNavToggles,
  toggleNavDrawer,
} from '@presentation/components/NavToggle.js';
import { renderNavDrawer, updateNavDrawer } from '@presentation/views/nav.js';

describe('nav toggle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ drawerOpen: false, view: 'editor' });
    document.body.appendChild(renderNavDrawer());
    updateNavDrawer(appState.get());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    appState.set({ drawerOpen: false });
  });

  it('controla o drawer e sincroniza o estado acessível', () => {
    const toggle = renderNavToggle();
    document.body.appendChild(toggle);

    expect(toggle.getAttribute('aria-controls')).toBe('nav-drawer');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Abrir menu de navegação');

    toggle.click();

    expect(appState.get().drawerOpen).toBe(true);
    expect(document.querySelector('#nav-overlay')).not.toBeNull();

    syncNavToggles(appState.get().drawerOpen);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Fechar menu de navegação');

    toggle.click();

    expect(appState.get().drawerOpen).toBe(false);
    expect(document.querySelector('#nav-overlay')).toBeNull();
  });

  it('expõe a ação de toggle também em chamadas diretas', () => {
    toggleNavDrawer();

    expect(appState.get().drawerOpen).toBe(true);
    expect(document.querySelector('#nav-overlay')).not.toBeNull();

    updateNavDrawer(appState.get());
    expect(document.querySelector('#nav-drawer')?.classList.contains('nav-drawer--open')).toBe(
      true
    );

    toggleNavDrawer();

    expect(appState.get().drawerOpen).toBe(false);
    expect(document.querySelector('#nav-overlay')).toBeNull();
  });
});
