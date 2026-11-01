import type { AppState } from '../state/AppState.js';
import { filterChains, sortChainsByPinned } from '../filters.js';
import { el } from '../dom.js';
import { renderChainListItem } from './ChainListItem.js';
import { renderEmptyDetail, renderLoadingState } from './states.js';

export interface EditorSidebarHandlers {
  onOpenChain: (chainId: string) => void;
  onNewChain: () => void;
  onFilter: (query: string) => void;
  onTogglePin: (chainId: string) => void;
  onImportFiles?: (chainId: string, files: File[]) => void;
}

export interface EditorSidebarView {
  element: HTMLElement;
  update: (state: AppState, activeChainId: string | null) => void;
}

export function mountEditorSidebar(handlers: EditorSidebarHandlers): EditorSidebarView {
  const sidebar = el('aside', 'editor-sidebar');
  sidebar.id = 'editor-sidebar';
  sidebar.setAttribute('aria-label', 'Cadeias');

  const header = el('div', 'editor-sidebar__header');
  header.innerHTML = `
    <div class="editor-sidebar__title-row">
      <h2 class="editor-sidebar__title">Cadeias</h2>
      <button class="btn-icon btn-icon--primary" id="editor-new-chain" type="button" aria-label="Nova cadeia (N)" title="Nova cadeia (N)">
        <span class="material-symbols-rounded" aria-hidden="true">add</span>
      </button>
    </div>
    <div class="search-bar editor-sidebar__search">
      <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
      <input type="search" class="search-bar__input" id="editor-sidebar-search"
        placeholder="Filtrar cadeias…" aria-label="Filtrar cadeias" autocomplete="off" />
      <button class="btn-icon search-bar__clear" id="editor-sidebar-clear" type="button" aria-label="Limpar filtro" hidden>
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </div>
  `;
  sidebar.appendChild(header);

  const list = el('div', 'editor-sidebar__list');
  list.id = 'editor-sidebar-list';
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Lista de cadeias');
  sidebar.appendChild(list);

  const search = header.querySelector<HTMLInputElement>('#editor-sidebar-search')!;
  const clear = header.querySelector<HTMLButtonElement>('#editor-sidebar-clear')!;

  search.addEventListener('input', () => handlers.onFilter(search.value));
  clear.addEventListener('click', () => {
    search.value = '';
    handlers.onFilter('');
    search.focus();
  });
  header
    .querySelector<HTMLButtonElement>('#editor-new-chain')
    ?.addEventListener('click', handlers.onNewChain);

  let dropTarget: HTMLElement | null = null;

  const hasFilePayload = (event: DragEvent): boolean =>
    Array.from(event.dataTransfer?.types ?? []).includes('Files');

  const clearDropTarget = (): void => {
    dropTarget?.classList.remove('chain-item--drop-target');
    dropTarget = null;
  };

  const setDropTarget = (item: HTMLElement | null): void => {
    if (dropTarget === item) return;
    clearDropTarget();
    dropTarget = item;
    dropTarget?.classList.add('chain-item--drop-target');
  };

  list.addEventListener('dragover', (event) => {
    if (!handlers.onImportFiles || !hasFilePayload(event)) return;
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>('.chain-item');
    if (!item) {
      clearDropTarget();
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setDropTarget(item);
  });

  list.addEventListener('dragleave', (event) => {
    if (!handlers.onImportFiles) return;
    const related = event.relatedTarget;
    if (related instanceof Node && list.contains(related)) return;
    clearDropTarget();
  });

  list.addEventListener('drop', (event) => {
    if (!handlers.onImportFiles || !hasFilePayload(event)) return;
    event.preventDefault();
    const item = (event.target as HTMLElement | null)?.closest<HTMLElement>('.chain-item');
    if (!item) {
      clearDropTarget();
      return;
    }

    event.stopPropagation();
    clearDropTarget();

    const chainId = item.dataset['chainId'];
    const files = event.dataTransfer ? [...event.dataTransfer.files] : [];
    if (chainId && files.length > 0) handlers.onImportFiles(chainId, files);
  });

  const update = (state: AppState, activeChainId: string | null): void => {
    if (search.value !== state.chainFilterQuery) {
      search.value = state.chainFilterQuery;
    }
    clear.hidden = !state.chainFilterQuery.trim();

    clearDropTarget();
    list.innerHTML = '';

    if (state.isLoading && state.chainSummaries.length === 0) {
      list.appendChild(renderLoadingState());
      return;
    }

    if (state.chainSummaries.length === 0) {
      list.appendChild(
        renderEmptyDetail(
          'account_tree',
          'Nenhuma cadeia ainda',
          'Crie sua primeira cadeia pelo botão + acima.'
        )
      );
      return;
    }

    const chains = sortChainsByPinned(
      filterChains(state.chainSummaries, state.chainFilterQuery),
      state.pinnedChainIds
    );

    if (chains.length === 0) {
      list.appendChild(
        renderEmptyDetail(
          'search_off',
          'Nenhuma cadeia encontrada',
          `Nada corresponde a "${state.chainFilterQuery}".`
        )
      );
      return;
    }

    chains.forEach((chain) => {
      list.appendChild(
        renderChainListItem(
          chain,
          chain.id === activeChainId,
          () => handlers.onOpenChain(chain.id),
          {
            isPinned: state.pinnedChainIds.includes(chain.id),
            onTogglePin: () => handlers.onTogglePin(chain.id),
          }
        )
      );
    });
  };

  return { element: sidebar, update };
}
