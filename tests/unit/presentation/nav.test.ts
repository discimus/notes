import { beforeEach, describe, expect, it } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { renderNavDrawer, updateNavDrawer } from '@presentation/views/nav.js';

describe('navegação lateral', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ view: 'chains', drawerOpen: false, theme: 'system' });
    document.body.appendChild(renderNavDrawer());
    updateNavDrawer(appState.get());
  });

  it('renderiza seis destinos com labels curtos e nomes acessíveis completos', () => {
    const items = [...document.querySelectorAll<HTMLElement>('.nav-item')];

    expect(items).toHaveLength(6);
    expect(items.map((item) => item.dataset['view'])).toEqual([
      'chains',
      'favorites',
      'tags',
      'timeline',
      'archived',
      'trash',
    ]);
    expect(items[0]?.querySelector('.nav-item__label')?.textContent).toBe('Cadeias');
    expect(items[0]?.getAttribute('aria-label')).toBe('Todas as cadeias');
    expect(items[0]?.title).toBe('Todas as cadeias');
    expect(items[3]?.querySelector('.nav-item__label')?.textContent).toBe('Timeline');
    expect(items[3]?.getAttribute('aria-label')).toBe('Visualizações');
  });

  it('marca apenas o destino atual e trata chain-detail como cadeias', () => {
    updateNavDrawer({ ...appState.get(), view: 'favorites' });

    expect(document.querySelector('[data-view="favorites"]')?.classList.contains('nav-item--active')).toBe(true);
    expect(document.querySelector('[data-view="chains"]')?.classList.contains('nav-item--active')).toBe(false);
    expect(document.querySelector('[data-view="favorites"]')?.getAttribute('aria-current')).toBe('page');

    updateNavDrawer({ ...appState.get(), view: 'chain-detail' });

    expect(document.querySelector('[data-view="chains"]')?.classList.contains('nav-item--active')).toBe(true);
  });

  it('controla o estado aberto do drawer e expõe o toggle de tema no rodapé', () => {
    updateNavDrawer({ ...appState.get(), drawerOpen: true });

    expect(document.querySelector('#nav-drawer')?.classList.contains('nav-drawer--open')).toBe(true);
    expect(document.querySelector('.nav-drawer__footer #theme-toggle')).not.toBeNull();
    expect(document.querySelector('#theme-toggle')?.getAttribute('title')).toBe('Tema: sistema');
  });
});
