import { beforeEach, describe, expect, it } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { updateTopbar } from '@presentation/views/topbar.js';

describe('topbar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ view: 'chains', drawerOpen: false });
  });

  it('usa o hambúrguer apenas como controle do drawer compacto', () => {
    const topbar = document.createElement('header');
    updateTopbar(topbar, appState.get());

    const burger = topbar.querySelector<HTMLButtonElement>('#nav-toggle');
    expect(burger).not.toBeNull();
    expect(burger?.classList.contains('app-topbar__menu')).toBe(true);
    expect(burger?.getAttribute('aria-controls')).toBe('nav-drawer');
    expect(burger?.getAttribute('aria-expanded')).toBe('false');
    expect(burger?.getAttribute('aria-label')).toBe('Abrir menu de navegação');
  });

  it('reflete o estado aberto no nome e no aria-expanded', () => {
    const topbar = document.createElement('header');
    updateTopbar(topbar, { ...appState.get(), drawerOpen: true });

    const burger = topbar.querySelector<HTMLButtonElement>('#nav-toggle');
    expect(burger?.getAttribute('aria-expanded')).toBe('true');
    expect(burger?.getAttribute('aria-label')).toBe('Fechar menu de navegação');
  });
});
