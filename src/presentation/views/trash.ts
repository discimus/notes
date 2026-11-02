import type { AppState } from '../state/AppState.js';
import { appState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { el } from '../dom.js';
import { filterChains } from '../filters.js';
import { renderNavToggle } from '../components/NavToggle.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';
import {
  escapeHtml,
  formatDateCompact,
  formatDateFull,
} from '@shared/utilities/index.js';

const TRASH_LIST_ID = 'trash-list';

function trashSubtitle(count: number): string {
  return `${count} ${count === 1 ? 'coleção' : 'coleções'}`;
}

function renderTrashHeader(state: AppState): HTMLElement {
  const header = el('header', 'trash-header');
  header.append(renderNavToggle());

  const heading = el('div', 'trash-header__heading');
  const title = el('h1', 'trash-header__title');
  title.textContent = 'Lixeira';
  const subtitle = el('p', 'trash-header__subtitle');
  subtitle.id = 'trash-count';
  subtitle.textContent = trashSubtitle(state.chainSummaries.length);
  heading.append(title, subtitle);
  header.appendChild(heading);

  const searchBar = el('div', 'search-bar trash-search');
  searchBar.innerHTML = `
    <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
    <input type="search" class="search-bar__input" id="trash-search-input"
      placeholder="Filtrar coleções" aria-label="Filtrar coleções na lixeira"
      autocomplete="off" value="${escapeHtml(state.chainFilterQuery)}" />
    <button class="btn-icon search-bar__clear" id="trash-filter-clear"
      aria-label="Limpar filtro" ${state.chainFilterQuery ? '' : 'hidden'}>
      <span class="material-symbols-rounded" aria-hidden="true">close</span>
    </button>
  `;
  header.appendChild(searchBar);

  const search = searchBar.querySelector<HTMLInputElement>('#trash-search-input')!;
  const clear = searchBar.querySelector<HTMLButtonElement>('#trash-filter-clear')!;
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

function renderTrashItem(chain: AppState['chainSummaries'][number]): HTMLElement {
  const item = el('article', 'trash-item');
  item.setAttribute('role', 'listitem');
  item.dataset['chainId'] = chain.id;
  item.setAttribute(
    'aria-label',
    `Coleção excluída: ${chain.displayTitle}, ${chain.noteCount} ${
      chain.noteCount === 1 ? 'nota' : 'notas'
    }`
  );

  const icon = el('span', 'material-symbols-rounded trash-item__icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = 'delete';

  const body = el('div', 'trash-item__body');
  const title = el('h2', 'trash-item__title');
  title.textContent = chain.displayTitle;
  const meta = el('p', 'trash-item__meta');
  const deletedAt = chain.deletedAt
    ? `Excluída em ${formatDateCompact(chain.deletedAt)}`
    : 'Na lixeira';
  meta.textContent = `${chain.noteCount} ${
    chain.noteCount === 1 ? 'nota' : 'notas'
  } · ${deletedAt}`;
  if (chain.deletedAt) meta.title = formatDateFull(chain.deletedAt);
  body.append(title, meta);

  const actions = el('div', 'trash-item__actions');
  const restore = el('button', 'btn btn-text trash-item__restore');
  restore.type = 'button';
  restore.setAttribute('aria-label', `Restaurar coleção ${chain.displayTitle}`);
  restore.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">restore_from_trash</span> Restaurar';
  restore.addEventListener('click', () => {
    void AppController.restoreFromTrash(chain.id);
  });

  const remove = el('button', 'btn btn-text trash-item__delete');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Excluir permanentemente ${chain.displayTitle}`);
  remove.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">delete_forever</span> Excluir permanentemente';
  remove.addEventListener('click', () => {
    void AppController.permanentDelete(chain.id);
  });

  actions.append(restore, remove);
  item.append(icon, body, actions);
  return item;
}

function renderTrashList(container: HTMLElement, state: AppState): void {
  container.replaceChildren();

  if (state.isLoading && state.chainSummaries.length === 0) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (state.chainSummaries.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'delete',
        'Lixeira vazia',
        'As coleções movidas para a lixeira aparecerão aqui.'
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

  chains.forEach((chain) => {
    container.appendChild(renderTrashItem(chain));
  });
}

export function renderTrashLayout(state: AppState): HTMLElement {
  const layout = el('div', 'trash-layout');
  const page = el('div', 'trash-page');
  page.appendChild(renderTrashHeader(state));

  const list = el('div', 'trash-list');
  list.id = TRASH_LIST_ID;
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Coleções na lixeira');
  page.appendChild(list);

  renderTrashList(list, state);
  layout.appendChild(page);
  return layout;
}

export function updateTrashLayout(content: HTMLElement, state: AppState): void {
  const search = content.querySelector<HTMLInputElement>('#trash-search-input');
  if (search && search.value !== state.chainFilterQuery) {
    search.value = state.chainFilterQuery;
  }
  const clear = content.querySelector<HTMLButtonElement>('#trash-filter-clear');
  if (clear) clear.hidden = !state.chainFilterQuery.trim();
  const count = content.querySelector<HTMLElement>('#trash-count');
  if (count) count.textContent = trashSubtitle(state.chainSummaries.length);
  const list = content.querySelector<HTMLElement>(`#${TRASH_LIST_ID}`);
  if (list) renderTrashList(list, state);
}
