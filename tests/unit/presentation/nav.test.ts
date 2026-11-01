import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { AppController } from '@presentation/pages/AppController.js';
import { renderNavDrawer, updateNavDrawer } from '@presentation/views/nav.js';

describe('navegação lateral', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'chains',
      drawerOpen: false,
      theme: 'system',
      searchQuery: '',
      searchResults: [],
    });
    document.body.appendChild(renderNavDrawer());
    updateNavDrawer(appState.get());
  });

  it('renderiza a busca e os cinco destinos com labels curtos', () => {
    const items = [...document.querySelectorAll<HTMLElement>('.nav-item')];

    expect(items).toHaveLength(6);
    expect(items.map((item) => item.dataset['view'])).toEqual([
      'search',
      'editor',
      'tags',
      'timeline',
      'archived',
      'trash',
    ]);
    expect(items[0]?.querySelector('.nav-item__label')?.textContent).toBe(
      'Pesquisar'
    );
    expect(items[0]?.getAttribute('aria-label')).toBe('Pesquisar');
    expect(items[0]?.getAttribute('title')).toBe('Pesquisar (Ctrl+K)');
    expect(items[1]?.querySelector('.nav-item__label')?.textContent).toBe('Editor');
    expect(items[1]?.getAttribute('aria-label')).toBe('Editor de texto');
    expect(items[2]?.querySelector('.nav-item__label')?.textContent).toBe('Tags');
    expect(items[2]?.getAttribute('aria-label')).toBe('Tags');
    expect(items[3]?.querySelector('.nav-item__label')?.textContent).toBe('Timeline');
    expect(items[3]?.getAttribute('aria-label')).toBe('Visualizações');
  });

  it('marca apenas o destino atual', () => {
    updateNavDrawer({ ...appState.get(), view: 'tags' });

    expect(document.querySelector('[data-view="tags"]')?.classList.contains('nav-item--active')).toBe(true);
    expect(document.querySelector('[data-view="editor"]')?.classList.contains('nav-item--active')).toBe(false);
    expect(document.querySelector('[data-view="tags"]')?.getAttribute('aria-current')).toBe('page');

    updateNavDrawer({ ...appState.get(), view: 'editor' });

    expect(document.querySelector('[data-view="editor"]')?.classList.contains('nav-item--active')).toBe(true);

    updateNavDrawer({ ...appState.get(), view: 'search' });

    expect(document.querySelector('[data-view="search"]')?.classList.contains('nav-item--active')).toBe(true);
  });

  it('abre a pesquisa limpando a consulta ao clicar em Pesquisar', () => {
    const navigate = vi.spyOn(AppController, 'navigateTo').mockResolvedValue(undefined);
    appState.set({ searchQuery: 'antigo', searchResults: [] });

    document.querySelector<HTMLButtonElement>('[data-view="search"]')?.click();

    expect(appState.get().searchQuery).toBe('');
    expect(navigate).toHaveBeenCalledWith('search');
    navigate.mockRestore();
  });

  it('controla o estado aberto do drawer e expõe o toggle de tema no rodapé', () => {
    updateNavDrawer({ ...appState.get(), drawerOpen: true });

    expect(document.querySelector('#nav-drawer')?.classList.contains('nav-drawer--open')).toBe(true);
    expect(document.querySelector('.nav-drawer__footer #theme-toggle')).not.toBeNull();
    expect(document.querySelector('#theme-toggle')?.getAttribute('title')).toBe('Tema: sistema');
  });
});
