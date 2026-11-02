import type { AppState } from '../state/AppState.js';
import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { el } from '../dom.js';
import { filterChains } from '../filters.js';
import { renderChainsBulkControls } from '../components/ChainsBulkControls.js';
import { renderNavToggle } from '../components/NavToggle.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';
import {
  escapeHtml,
  formatDateCompact,
  formatDateFull,
} from '@shared/utilities/index.js';

const ARCHIVE_LIST_ID = 'archive-list';

function archiveSubtitle(count: number): string {
  return `${count} ${count === 1 ? 'coleção' : 'coleções'}`;
}

function renderArchiveHeader(state: AppState): HTMLElement {
  const header = el('header', 'archive-header');
  header.append(renderNavToggle());

  const heading = el('div', 'archive-header__heading');
  const title = el('h1', 'archive-header__title');
  title.textContent = 'Arquivo';
  const subtitle = el('p', 'archive-header__subtitle');
  subtitle.id = 'archive-count';
  subtitle.textContent = archiveSubtitle(state.chainSummaries.length);
  heading.append(title, subtitle);
  header.appendChild(heading);

  const searchBar = el('div', 'search-bar archive-search');
  searchBar.innerHTML = `
    <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
    <input type="search" class="search-bar__input" id="archive-search-input"
      placeholder="Filtrar coleções" aria-label="Filtrar coleções arquivadas"
      autocomplete="off" value="${escapeHtml(state.chainFilterQuery)}" />
    <button class="btn-icon search-bar__clear" id="archive-filter-clear"
      aria-label="Limpar filtro" ${state.chainFilterQuery ? '' : 'hidden'}>
      <span class="material-symbols-rounded" aria-hidden="true">close</span>
    </button>
  `;
  header.appendChild(searchBar);

  const bulkHost = el('div');
  bulkHost.id = 'archive-bulk-controls';
  header.appendChild(bulkHost);
  renderArchiveBulkControls(header, state);

  const search = searchBar.querySelector<HTMLInputElement>('#archive-search-input')!;
  const clear = searchBar.querySelector<HTMLButtonElement>('#archive-filter-clear')!;
  search.addEventListener('input', () => {
    appState.set({ chainFilterQuery: search.value });
  });
  clear.addEventListener('click', () => {
    search.value = '';
    appState.set({ chainFilterQuery: '' });
    search.focus();
  });

  return header;
}

function renderArchiveItem(
  chain: AppState['chainSummaries'][number],
  selectionMode = false,
  selected = false
): HTMLElement {
  const item = el('article', 'archive-item');
  item.setAttribute('role', 'listitem');
  item.dataset['chainId'] = chain.id;
  item.classList.toggle('archive-item--selected', selected);
  item.classList.toggle('archive-item--selectable', selectionMode);
  item.setAttribute(
    'aria-label',
    `Coleção arquivada: ${chain.displayTitle}, ${chain.noteCount} ${
      chain.noteCount === 1 ? 'nota' : 'notas'
    }`
  );

  if (selectionMode) {
    const selectLabel = el('label', 'archive-item__select');
    const selectInput = document.createElement('input');
    selectInput.type = 'checkbox';
    selectInput.checked = selected;
    selectInput.dataset['chainSelect'] = chain.id;
    selectInput.setAttribute(
      'aria-label',
      `Selecionar coleção ${chain.displayTitle}`
    );
    selectInput.addEventListener('click', (event) => event.stopPropagation());
    selectInput.addEventListener('change', () =>
      AppController.toggleChainSelection(chain.id)
    );
    selectLabel.appendChild(selectInput);
    selectLabel.addEventListener('click', (event) => event.stopPropagation());
    item.appendChild(selectLabel);
    item.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      if (target?.closest('button, input, label, a')) return;
      AppController.toggleChainSelection(chain.id);
    });
  }

  const icon = el('span', 'material-symbols-rounded archive-item__icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = 'archive';

  const body = el('div', 'archive-item__body');
  const title = el('h2', 'archive-item__title');
  title.textContent = chain.displayTitle;
  const meta = el('p', 'archive-item__meta');
  const archivedAt = chain.archivedAt
    ? `Arquivada em ${formatDateCompact(chain.archivedAt)}`
    : 'No arquivo';
  meta.textContent = `${chain.noteCount} ${
    chain.noteCount === 1 ? 'nota' : 'notas'
  } · ${archivedAt}`;
  if (chain.archivedAt) meta.title = formatDateFull(chain.archivedAt);
  body.append(title, meta);

  const actions = el('div', 'archive-item__actions');
  const restore = el('button', 'btn btn-text archive-item__restore');
  restore.type = 'button';
  restore.setAttribute('aria-label', `Restaurar coleção ${chain.displayTitle}`);
  restore.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">unarchive</span> Restaurar';
  restore.addEventListener('click', () => {
    void AppController.restoreChain(chain.id);
  });

  const remove = el('button', 'btn btn-text archive-item__delete');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Mover coleção ${chain.displayTitle} para a lixeira`);
  remove.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">delete</span> Mover para lixeira';
  remove.addEventListener('click', () => {
    void AppController.moveArchivedToTrash(chain.id);
  });

  actions.append(restore, remove);
  if (!selectionMode) item.append(icon, body, actions);
  else item.append(icon, body);
  return item;
}

function renderArchiveBulkControls(
  container: HTMLElement,
  state: AppState
): void {
  const host = container.querySelector<HTMLElement>('#archive-bulk-controls');
  if (!host) return;
  const visibleChainIds = filterChains(
    state.chainSummaries,
    state.chainFilterQuery
  ).map((chain) => chain.id);

  host.replaceChildren(
    renderChainsBulkControls({
      idPrefix: 'archive',
      mode: state.chainsBulkMode,
      selectedIds: state.chainsBulkSelection,
      visibleChainIds,
      onEnter: () => AppController.enterChainsBulkMode(),
      onExit: () => AppController.exitChainsBulkMode(),
      onToggleAll: (ids) => AppController.toggleAllChainsBulkSelection(ids),
      actions: [
        {
          id: 'restore',
          label: 'Restaurar coleções selecionadas',
          icon: 'unarchive',
          onClick: () => {
            void AppController.restoreSelectedArchivedChains();
          },
        },
        {
          id: 'trash',
          label: 'Mover coleções selecionadas para a lixeira',
          icon: 'delete',
          onClick: () => {
            void AppController.moveSelectedArchivedToTrash();
          },
        },
      ],
    })
  );
}

function renderArchiveList(container: HTMLElement, state: AppState): void {
  container.replaceChildren();

  if (state.isLoading && state.chainSummaries.length === 0) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (state.chainSummaries.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'archive',
        'Nenhuma coleção arquivada',
        'As coleções que você arquivar aparecerão aqui.'
      )
    );
    return;
  }

  const chains = filterChains(state.chainSummaries, state.chainFilterQuery);
  if (chains.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'search_off',
        'Nenhuma coleção encontrada',
        `Nada corresponde a "${state.chainFilterQuery}".`
      )
    );
    return;
  }

  const selection = new Set(state.chainsBulkSelection);
  const selectionMode = state.chainsBulkMode;
  chains.forEach((chain) => {
    container.appendChild(
      renderArchiveItem(chain, selectionMode, selection.has(chain.id))
    );
  });
}

export function renderArchiveLayout(state: AppState): HTMLElement {
  const layout = el('div', 'archive-layout');
  const page = el('div', 'archive-page');
  page.appendChild(renderArchiveHeader(state));

  const list = el('div', 'archive-list');
  list.id = ARCHIVE_LIST_ID;
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Coleções arquivadas');
  page.appendChild(list);

  renderArchiveList(list, state);
  layout.appendChild(page);
  return layout;
}

export function updateArchiveLayout(content: HTMLElement, state: AppState): void {
  const search = content.querySelector<HTMLInputElement>('#archive-search-input');
  if (search && search.value !== state.chainFilterQuery) {
    search.value = state.chainFilterQuery;
  }
  const clear = content.querySelector<HTMLButtonElement>('#archive-filter-clear');
  if (clear) clear.hidden = !state.chainFilterQuery.trim();
  const count = content.querySelector<HTMLElement>('#archive-count');
  if (count) count.textContent = archiveSubtitle(state.chainSummaries.length);
  renderArchiveBulkControls(content, state);
  const list = content.querySelector<HTMLElement>(`#${ARCHIVE_LIST_ID}`);
  if (list) renderArchiveList(list, state);
}
