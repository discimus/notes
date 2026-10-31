import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { el } from '../dom.js';
import { showSearchPanel } from './search.js';
import { showChainMenu } from './menus.js';

export function updateTopbar(topbar: HTMLElement, state: AppState): void {
  topbar.innerHTML = '';

  const burger = el('button', 'btn-icon app-topbar__menu');
  burger.id = 'nav-toggle';
  burger.setAttribute('aria-label', state.drawerOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
  burger.setAttribute('aria-expanded', state.drawerOpen ? 'true' : 'false');
  burger.setAttribute('aria-controls', 'nav-drawer');
  burger.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">menu</span>';
  burger.addEventListener('click', () => {
    const next = !appState.get().drawerOpen;
    appState.set({ drawerOpen: next });
    if (next) {
      const overlay = el('div', 'nav-drawer-overlay');
      overlay.id = 'nav-overlay';
      overlay.addEventListener('click', () => {
        appState.set({ drawerOpen: false });
        overlay.remove();
      });
      document.body.appendChild(overlay);
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('#nav-drawer .nav-item')?.focus();
      });
    } else {
      document.querySelector('#nav-overlay')?.remove();
    }
  });
  topbar.appendChild(burger);

  const title = el('h1', 'app-topbar__title');
  if (state.view === 'editor') title.textContent = 'Editor';
  else if (state.view === 'chains') title.textContent = 'Todas as cadeias';
  else if (state.view === 'favorites') title.textContent = 'Favoritos';
  else if (state.view === 'archived') title.textContent = 'Arquivo';
  else if (state.view === 'trash') title.textContent = 'Lixeira';
  else if (state.view === 'tags') title.textContent = 'Tags';
  else if (state.view === 'timeline') title.textContent = 'Visualização cronológica';
  else if (state.view === 'search') title.textContent = `Pesquisa: "${state.searchQuery}"`;
  else if (state.view === 'chain-detail' && state.currentChain) {
    title.textContent = state.currentChain.displayTitle;
  } else {
    title.textContent = 'ThreadNotes';
  }
  topbar.appendChild(title);

  const actions = el('div', 'app-topbar__actions');

  const searchBtn = el('button', 'btn-icon');
  searchBtn.setAttribute('aria-label', 'Pesquisar');
  searchBtn.setAttribute('title', 'Pesquisar (Ctrl+K)');
  searchBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">search</span>';
  searchBtn.addEventListener('click', () => showSearchPanel());
  actions.appendChild(searchBtn);

  if (state.view === 'chain-detail' && state.currentChain) {
    const moreBtn = el('button', 'btn-icon');
    moreBtn.setAttribute('aria-label', 'Mais opções');
    moreBtn.setAttribute('title', 'Mais opções');
    moreBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">more_vert</span>';
    moreBtn.addEventListener('click', (e) => showChainMenu(e, state.currentChain!.id));
    actions.appendChild(moreBtn);
  }

  topbar.appendChild(actions);
}
