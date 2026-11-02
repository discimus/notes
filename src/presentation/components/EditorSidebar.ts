import type { AppState } from '../state/AppState.js';
import { filterChains, sortChainsByPinned } from '../filters.js';
import { el } from '../dom.js';
import { renderChainListItem } from './ChainListItem.js';
import { renderEmptyDetail, renderLoadingState } from './states.js';

export interface EditorSidebarHandlers {
  onOpenChain: (chainId: string) => void;
  onOpenChainPinned?: (chainId: string) => void;
  onNewChain: () => void;
  onFilter: (query: string) => void;
  onTogglePin: (chainId: string) => void;
  onImportFiles?: (chainId: string, files: File[]) => void;
  onEnterBulkSelection?: () => void;
  onExitBulkSelection?: () => void;
  onToggleBulkSelection?: (chainId: string) => void;
  onArchiveSelectedChains?: () => void;
  onDeleteSelectedChains?: () => void;
}

export interface EditorSidebarView {
  element: HTMLElement;
  update: (state: AppState, activeChainId: string | null) => void;
}

export function mountEditorSidebar(handlers: EditorSidebarHandlers): EditorSidebarView {
  const sidebar = el('aside', 'editor-sidebar');
  sidebar.id = 'editor-sidebar';
  sidebar.setAttribute('aria-label', 'Coleções');

  const header = el('div', 'editor-sidebar__header');
  header.innerHTML = `
    <div class="editor-sidebar__title-row">
      <h2 class="editor-sidebar__title">Coleções</h2>
      <div class="editor-sidebar__title-actions">
        <button class="btn-icon editor-sidebar__select" id="editor-sidebar-select" type="button" aria-label="Selecionar coleções" title="Selecionar coleções" aria-pressed="false">
          <span class="material-symbols-rounded" aria-hidden="true">checklist</span>
        </button>
        <button class="btn-icon btn-icon--primary" id="editor-new-chain" type="button" aria-label="Nova coleção (N)" title="Nova coleção (N)">
          <span class="material-symbols-rounded" aria-hidden="true">add</span>
        </button>
      </div>
    </div>
    <div class="editor-sidebar__bulk" id="editor-sidebar-bulk" hidden>
      <span class="editor-sidebar__bulk-count" id="editor-sidebar-bulk-count"></span>
      <button class="btn-icon" id="editor-sidebar-bulk-archive" type="button" aria-label="Arquivar coleções selecionadas" title="Arquivar selecionadas">
        <span class="material-symbols-rounded" aria-hidden="true">archive</span>
      </button>
      <button class="btn-icon" id="editor-sidebar-bulk-delete" type="button" aria-label="Excluir coleções selecionadas" title="Mover selecionadas para a lixeira">
        <span class="material-symbols-rounded" aria-hidden="true">delete</span>
      </button>
    </div>
    <div class="search-bar editor-sidebar__search">
      <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
      <input type="search" class="search-bar__input" id="editor-sidebar-search"
        placeholder="Filtrar coleções…" aria-label="Filtrar coleções" autocomplete="off" />
      <button class="btn-icon search-bar__clear" id="editor-sidebar-clear" type="button" aria-label="Limpar filtro" hidden>
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </div>
  `;
  sidebar.appendChild(header);

  const list = el('div', 'editor-sidebar__list');
  list.id = 'editor-sidebar-list';
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Lista de coleções');
  sidebar.appendChild(list);

  const search = header.querySelector<HTMLInputElement>('#editor-sidebar-search')!;
  const clear = header.querySelector<HTMLButtonElement>('#editor-sidebar-clear')!;
  const selectButton = header.querySelector<HTMLButtonElement>(
    '#editor-sidebar-select'
  )!;
  const selectIcon = selectButton.querySelector<HTMLElement>(
    '.material-symbols-rounded'
  )!;
  const newButton = header.querySelector<HTMLButtonElement>(
    '#editor-new-chain'
  )!;
  const bulkRow = header.querySelector<HTMLElement>('#editor-sidebar-bulk')!;
  const bulkCount = header.querySelector<HTMLElement>(
    '#editor-sidebar-bulk-count'
  )!;
  const bulkArchive = header.querySelector<HTMLButtonElement>(
    '#editor-sidebar-bulk-archive'
  )!;
  const bulkDelete = header.querySelector<HTMLButtonElement>(
    '#editor-sidebar-bulk-delete'
  )!;
  let bulkSelectionActive = false;

  search.addEventListener('input', () => handlers.onFilter(search.value));
  clear.addEventListener('click', () => {
    search.value = '';
    handlers.onFilter('');
    search.focus();
  });
  newButton.addEventListener('click', handlers.onNewChain);
  selectButton.addEventListener('click', () => {
    if (bulkSelectionActive) handlers.onExitBulkSelection?.();
    else handlers.onEnterBulkSelection?.();
  });
  bulkArchive.addEventListener('click', () =>
    handlers.onArchiveSelectedChains?.()
  );
  bulkDelete.addEventListener('click', () =>
    handlers.onDeleteSelectedChains?.()
  );

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

    const bulkMode = state.chainsBulkMode;
    const canSelect = Boolean(handlers.onEnterBulkSelection);
    bulkSelectionActive = bulkMode;
    selectButton.hidden = !canSelect;
    selectButton.classList.toggle('btn-icon--active', bulkMode);
    selectButton.setAttribute('aria-pressed', bulkMode ? 'true' : 'false');
    selectButton.setAttribute(
      'aria-label',
      bulkMode ? 'Cancelar seleção de coleções' : 'Selecionar coleções'
    );
    selectButton.title = bulkMode
      ? 'Cancelar seleção de coleções'
      : 'Selecionar coleções';
    selectIcon.textContent = bulkMode ? 'close' : 'checklist';
    newButton.hidden = bulkMode;
    bulkRow.hidden = !bulkMode;
    if (bulkMode) {
      const count = state.chainsBulkSelection.length;
      bulkCount.textContent =
        count === 0
          ? 'Selecionar coleções'
          : `${count} ${count === 1 ? 'selecionada' : 'selecionadas'}`;
      bulkArchive.disabled = count === 0;
      bulkDelete.disabled = count === 0;
    }

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
          'Nenhuma coleção ainda',
          'Crie sua primeira coleção pelo botão + acima.'
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
          'Nenhuma coleção encontrada',
          `Nada corresponde a "${state.chainFilterQuery}".`
        )
      );
      return;
    }

    const selectionMode = bulkMode && Boolean(handlers.onToggleBulkSelection);

    chains.forEach((chain) => {
      list.appendChild(
        renderChainListItem(
          chain,
          chain.id === activeChainId,
          () => handlers.onOpenChain(chain.id),
          {
            ...(selectionMode
              ? {
                  selectionMode: true,
                  selected: state.chainsBulkSelection.includes(chain.id),
                  onToggleSelect: () =>
                    handlers.onToggleBulkSelection?.(chain.id),
                }
              : {
                  isPinned: state.pinnedChainIds.includes(chain.id),
                  onTogglePin: () => handlers.onTogglePin(chain.id),
                  ...(handlers.onOpenChainPinned
                    ? {
                        onOpenPinned: () =>
                          handlers.onOpenChainPinned?.(chain.id),
                      }
                    : {}),
                }),
          }
        )
      );
    });
  };

  return { element: sidebar, update };
}
