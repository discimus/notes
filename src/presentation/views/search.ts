import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { el, qs } from '../dom.js';
import { debounce, escapeHtml, formatDate, highlightMatch } from '@shared/utilities/index.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';
import { renderNavToggle } from '../components/NavToggle.js';

const SEARCH_PAGE_MARGIN = 180;

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
    if (input.value.trim()) {
      void AppController.search(input.value);
    } else {
      AppController.clearSearch();
    }
  }, 350);
  input.addEventListener('input', debouncedSearch as EventListener);

  queueMicrotask(() => {
    if (!input.isConnected) return;
    input.focus({ preventScroll: true });
    if (state.searchSelectedNoteId) {
      scrollSelectedResultToTop(results, state.searchSelectedNoteId);
    }
  });

  const clearBtn = searchBar.querySelector('#search-clear');
  clearBtn?.addEventListener('click', () => {
    input.value = '';
    AppController.clearSearch();
    input.focus();
  });

  results.addEventListener(
    'scroll',
    () => {
      const distance =
        results.scrollHeight - results.scrollTop - results.clientHeight;
      if (distance < SEARCH_PAGE_MARGIN) {
        void AppController.loadMoreSearch();
      }
    },
    { passive: true }
  );

  renderSearchResults(results, state);
  return layout;
}

export function updateSearchLayout(content: HTMLElement, state: AppState): void {
  const clearBtn = qs('#search-clear', content);
  if (clearBtn) clearBtn.hidden = !state.searchQuery;

  const results = qs('#search-results-list', content);
  if (results) renderSearchResults(results, state);
}

function renderSearchResults(container: HTMLElement, state: AppState): void {
  if (state.isLoading) {
    clearSearchResults(container);
    container.appendChild(renderLoadingState());
    return;
  }

  if (!state.searchQuery) {
    clearSearchResults(container);
    container.appendChild(renderEmptyDetail('search', 'Pesquise suas notas', 'Digite acima para buscar em conteúdo, títulos e tags.'));
    return;
  }

  if (state.searchResults.length === 0) {
    clearSearchResults(container);
    container.appendChild(renderEmptyDetail('search_off', 'Nenhum resultado', `Não encontramos nada para "${state.searchQuery}".`));
    return;
  }

  if (container.dataset.query !== state.searchQuery) {
    clearSearchResults(container);
    container.dataset.query = state.searchQuery;
    container.dataset.renderedCount = '0';
  }

  container.querySelector('.search-results__loading')?.remove();

  const renderedCount = Number(container.dataset.renderedCount ?? '0');
  const newResults = state.searchResults.slice(renderedCount);
  for (const result of newResults) {
    container.appendChild(renderSearchResult(result, state.searchQuery));
  }
  container.dataset.renderedCount = String(state.searchResults.length);

  container.querySelectorAll<HTMLElement>('.search-result').forEach((item) => {
    const selected = item.dataset['noteId'] === state.searchSelectedNoteId;
    item.classList.toggle('search-result--selected', selected);
    if (selected) {
      item.setAttribute('aria-current', 'true');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  if (state.searchIsLoadingMore) {
    const loading = el('div', 'search-results__loading');
    loading.setAttribute('role', 'status');
    loading.textContent = 'Carregando mais…';
    container.appendChild(loading);
  }

  schedulePaginationCheck(container, state);
}

function schedulePaginationCheck(
  container: HTMLElement,
  state: AppState
): void {
  if (!state.searchHasMore || state.searchIsLoadingMore) return;

  queueMicrotask(() => {
    if (!container.isConnected || container.clientHeight === 0) return;
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distance < SEARCH_PAGE_MARGIN) {
      void AppController.loadMoreSearch();
    }
  });
}

function renderSearchResult(
  result: AppState['searchResults'][number],
  query: string
): HTMLElement {
  const item = el('div', 'search-result card card--interactive');
  item.dataset['noteId'] = result.noteId;
  item.setAttribute('role', 'listitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `Resultado em ${result.chainTitle}`);

  const highlighted = highlightMatch(result.snippet, query);

  item.innerHTML = `
    <p class="search-result__chain">${escapeHtml(result.chainTitle)}</p>
    <p class="search-result__snippet">${highlighted}</p>
    <p class="search-result__meta">
      <time datetime="${result.noteCreatedAt}">${formatDate(result.noteCreatedAt)}</time>
      · ${result.noteRole === 'header' ? 'Header' : 'Tail'}
    </p>
  `;

  const open = () => {
    appState.set({ searchSelectedNoteId: result.noteId });
    const container = item.parentElement;
    if (container) {
      container
        .querySelectorAll('.search-result--selected')
        .forEach((selected) => {
          selected.classList.remove('search-result--selected');
          selected.removeAttribute('aria-current');
        });
      item.classList.add('search-result--selected');
      item.setAttribute('aria-current', 'true');
      scrollResultToTop(container, item);
    }
    void AppController.openSearchResult(result.chainId, result.noteId);
  };
  item.addEventListener('click', open);
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') open();
  });

  return item;
}

function scrollSelectedResultToTop(
  container: HTMLElement,
  noteId: string
): void {
  const item = container.querySelector<HTMLElement>(
    `.search-result[data-note-id="${noteId}"]`
  );
  if (item) scrollResultToTop(container, item);
}

function scrollResultToTop(
  container: HTMLElement,
  item: HTMLElement
): void {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  container.scrollTop += itemRect.top - containerRect.top;
}

function clearSearchResults(container: HTMLElement): void {
  container.innerHTML = '';
  delete container.dataset.query;
  delete container.dataset.renderedCount;
}

export function showSearchPanel(): void {
  AppController.clearSearch();
  void AppController.navigateTo('search');
}
