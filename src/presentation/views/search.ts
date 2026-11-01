import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { el, qs } from '../dom.js';
import { debounce, escapeHtml, formatDate, highlightMatch } from '@shared/utilities/index.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';
import { renderNavToggle } from '../components/NavToggle.js';

export function renderSearchLayout(state: AppState): HTMLElement {
  const layout = el('div', 'search-layout');
  layout.setAttribute('id', 'search-layout');

  const searchHeader = el('div', 'search-header');

  const searchBar = el('div', 'search-bar');
  searchBar.innerHTML = `
    <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
    <input type="search" class="search-bar__input" id="search-input-main"
      placeholder="Pesquisar notas, títulos, tags…" aria-label="Campo de pesquisa"
      autocomplete="off" value="${escapeHtml(state.searchQuery)}" />
    <button class="btn-icon search-bar__clear" id="search-clear" aria-label="Limpar pesquisa"
      ${state.searchQuery ? '' : 'hidden'}>
      <span class="material-symbols-rounded" aria-hidden="true">close</span>
    </button>
  `;
  searchHeader.appendChild(renderNavToggle());
  searchHeader.appendChild(searchBar);
  layout.appendChild(searchHeader);

  const results = el('div', 'search-results');
  results.setAttribute('id', 'search-results-list');
  results.setAttribute('role', 'list');
  results.setAttribute('aria-live', 'polite');
  results.setAttribute('aria-label', 'Resultados da pesquisa');
  layout.appendChild(results);

  const input = searchBar.querySelector<HTMLInputElement>('#search-input-main')!;
  const debouncedSearch = debounce(() => {
    if (input.value.trim()) AppController.search(input.value);
  }, 350);
  input.addEventListener('input', debouncedSearch as EventListener);
  input.focus();

  const clearBtn = searchBar.querySelector('#search-clear');
  clearBtn?.addEventListener('click', () => {
    input.value = '';
    appState.set({ searchQuery: '', searchResults: [] });
  });

  renderSearchResults(results, state);
  return layout;
}

export function updateSearchLayout(content: HTMLElement, state: AppState): void {
  const results = qs('#search-results-list', content);
  if (results) renderSearchResults(results, state);
}

function renderSearchResults(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';

  if (state.isLoading) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (!state.searchQuery) {
    container.appendChild(renderEmptyDetail('search', 'Pesquise suas notas', 'Digite acima para buscar em conteúdo, títulos e tags.'));
    return;
  }

  if (state.searchResults.length === 0) {
    container.appendChild(renderEmptyDetail('search_off', 'Nenhum resultado', `Não encontramos nada para "${state.searchQuery}".`));
    return;
  }

  state.searchResults.forEach((result) => {
    const item = el('div', 'search-result card card--interactive');
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Resultado em ${result.chainTitle}`);

    const highlighted = highlightMatch(result.snippet, state.searchQuery);

    item.innerHTML = `
      <p class="search-result__chain">${escapeHtml(result.chainTitle)}</p>
      <p class="search-result__snippet">${highlighted}</p>
      <p class="search-result__meta">
        <time datetime="${result.noteCreatedAt}">${formatDate(result.noteCreatedAt)}</time>
        · ${result.noteRole === 'header' ? 'Header' : 'Tail'}
      </p>
    `;

    const open = () => {
      void AppController.navigateTo('editor', result.chainId);
    };
    item.addEventListener('click', open);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });

    container.appendChild(item);
  });
}

export function showSearchPanel(): void {
  appState.set({ searchQuery: '', searchResults: [] });
  void AppController.navigateTo('search');
}
