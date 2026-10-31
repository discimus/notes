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

  it('renderiza cinco destinos com labels curtos e nomes acessíveis completos', () => {
    const items = [...document.querySelectorAll<HTMLElement>('.nav-item')];

    expect(items).toHaveLength(5);
    expect(items.map((item) => item.dataset['view'])).toEqual([
      'editor',
      'tags',
      'timeline',
      'archived',
      'trash',
    ]);
    expect(items[0]?.querySelector('.nav-item__label')?.textContent).toBe('Editor');
    expect(items[0]?.getAttribute('aria-label')).toBe('Editor de texto');
    expect(items[1]?.querySelector('.nav-item__label')?.textContent).toBe('Tags');
    expect(items[1]?.getAttribute('aria-label')).toBe('Tags');
    expect(items[2]?.querySelector('.nav-item__label')?.textContent).toBe('Timeline');
    expect(items[2]?.getAttribute('aria-label')).toBe('Visualizações');
  });

  it('marca apenas o destino atual', () => {
    updateNavDrawer({ ...appState.get(), view: 'tags' });

    expect(document.querySelector('[data-view="tags"]')?.classList.contains('nav-item--active')).toBe(true);
    expect(document.querySelector('[data-view="editor"]')?.classList.contains('nav-item--active')).toBe(false);
    expect(document.querySelector('[data-view="tags"]')?.getAttribute('aria-current')).toBe('page');

    updateNavDrawer({ ...appState.get(), view: 'editor' });

    expect(document.querySelector('[data-view="editor"]')?.classList.contains('nav-item--active')).toBe(true);
  });

  it('controla o estado aberto do drawer e expõe o toggle de tema no rodapé', () => {
    updateNavDrawer({ ...appState.get(), drawerOpen: true });

    expect(document.querySelector('#nav-drawer')?.classList.contains('nav-drawer--open')).toBe(true);
    expect(document.querySelector('.nav-drawer__footer #theme-toggle')).not.toBeNull();
    expect(document.querySelector('#theme-toggle')?.getAttribute('title')).toBe('Tema: sistema');
  });
});
