import { appState } from '../state/AppState.js';
import type { AppState, TimelineFilters } from '../state/AppState.js';
import type { NoteContentType } from '@application/dto/index.js';
import { AppController } from '../pages/AppController.js';
import { el, qs } from '../dom.js';
import {
  formatDateFull,
  formatTime,
  normalizeText,
} from '@shared/utilities/index.js';
import type { ChainSummaryDTO, TagDTO, TimelineEntryDTO } from '@application/dto/index.js';
import { renderLinkedText } from '../components/LinkedText.js';
import { renderMarkdownContent } from '../components/MarkdownContent.js';
import { highlightTextInElement } from '../components/SearchHighlight.js';
import { renderNotePreview } from '../components/NotePreview.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';
import { renderNavToggle } from '../components/NavToggle.js';
import { getTimelineChainColors } from '../app/timelineColors.js';
import {
  deleteTimelineSearch,
  getSavedTimelineSearches,
  saveTimelineSearch,
  type SavedTimelineSearch,
} from '../app/timelineSavedSearches.js';
import { showInputDialog } from '../components/Dialog.js';
import { mountInlineTagEditor } from '../components/InlineTagEditor.js';
import type { InlineTagEditorView } from '../components/InlineTagEditor.js';
import { snackbar } from '../components/Snackbar.js';
import { enableMagneticDragScroll } from '../components/dragScroll.js';

let queryTimer: ReturnType<typeof setTimeout> | null = null;
let timelineOutsideClickCleanup: (() => void) | null = null;
let activeTimelineTagEditor: InlineTagEditorView | null = null;
const timelineScrollIgnoreUntil = new WeakMap<HTMLElement, number>();

function markTimelineProgrammaticScroll(container: HTMLElement): void {
  timelineScrollIgnoreUntil.set(container, performance.now() + 120);
}

const TIMELINE_VISIBLE_TAGS = 3;

const CONTENT_TYPES: Array<{ value: NoteContentType; label: string }> = [
  { value: 'text', label: 'Texto' },
  { value: 'code', label: 'Código' },
  { value: 'markdown', label: 'Markdown' },
];

const DATE_PRESETS = [
  { value: 'all', label: 'Qualquer data', days: null },
  { value: 'today', label: 'Hoje', days: 1 },
  { value: '7d', label: '7 dias', days: 7 },
  { value: '30d', label: '30 dias', days: 30 },
  { value: '90d', label: '90 dias', days: 90 },
] as const;

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function datePresetRange(days: number): { from: string; to: string } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from: dateInputValue(from), to: dateInputValue(to) };
}

function isDatePresetActive(filters: TimelineFilters, days: number | null): boolean {
  if (days === null) return !filters.from && !filters.to;
  const range = datePresetRange(days);
  return filters.from === range.from && filters.to === range.to;
}

function contentTypeLabel(value: NoteContentType): string {
  return CONTENT_TYPES.find((item) => item.value === value)?.label ?? value;
}

function matchedField(
  note: TimelineEntryDTO['note'],
  chainTitle: string,
  query: string
): 'Título' | 'Conteúdo' | 'Coleção' | 'Tag' | null {
  const normalized = normalizeText(query);
  if (!normalized) return null;
  if (note.title && normalizeText(note.title).includes(normalized)) {
    return 'Título';
  }
  if (
    (note.tags ?? []).some((tag) =>
      normalizeText(tag.name).includes(normalized)
    )
  ) {
    return 'Tag';
  }
  if (normalizeText(chainTitle).includes(normalized)) return 'Coleção';
  if (normalizeText(note.content).includes(normalized)) return 'Conteúdo';
  return null;
}

function formatFilterDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function renderTimelineLayout(state: AppState): HTMLElement {
  if (queryTimer) {
    clearTimeout(queryTimer);
    queryTimer = null;
  }
  activeTimelineTagEditor?.destroy();
  activeTimelineTagEditor = null;

  const layout = el('div', 'timeline-panel');
  layout.setAttribute('id', 'timeline-layout');

  timelineOutsideClickCleanup?.();
  const onDocumentClick = (event: MouseEvent): void => {
    if (!layout.isConnected) return;
    const current = appState.get();
    if (current.view !== 'timeline' || current.timelinePreviewNoteId === null) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('#timeline-list')) return;
    if (
      target.closest('#timeline-preview') ||
      target.closest('.timeline-entry')
    ) {
      return;
    }
    appState.set({ timelinePreviewNoteId: null });
  };
  document.addEventListener('click', onDocumentClick);
  timelineOutsideClickCleanup = () =>
    document.removeEventListener('click', onDocumentClick);

  const header = el('div', 'timeline-panel__header');
  header.setAttribute('role', 'search');
  header.innerHTML = `
    <div class="timeline-search-row">
      <div class="search-bar timeline-filter-search">
        <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
        <input type="search" class="search-bar__input" id="timeline-query"
          placeholder="Buscar notas..." aria-label="Buscar nas notas" autocomplete="off" />
      </div>
      <button class="btn-icon timeline-saved-search" id="timeline-saved-search" type="button"
        aria-label="Buscas salvas" title="Buscas salvas" aria-haspopup="menu" aria-expanded="false">
        <span class="material-symbols-rounded" aria-hidden="true">bookmarks</span>
      </button>
      <button class="btn-icon timeline-clear-filters" id="timeline-clear-filters" type="button"
        aria-label="Limpar filtros" title="Limpar filtros">
        <span class="material-symbols-rounded" aria-hidden="true">filter_alt_off</span>
      </button>
    </div>

    <details class="timeline-advanced" id="timeline-filters-details">
      <summary class="timeline-advanced__summary">
        <span class="material-symbols-rounded" aria-hidden="true">tune</span>
        <span class="timeline-advanced__label">Filtros</span>
        <span class="timeline-filter-count" id="timeline-filter-count" hidden></span>
      </summary>
      <div class="timeline-filters" role="region" aria-labelledby="timeline-filters-title">
        <header class="timeline-filters__header">
          <div class="timeline-filters__heading">
            <h2 class="timeline-filters__title" id="timeline-filters-title">Filtros</h2>
            <p class="timeline-filters__subtitle">
              Combine período, conteúdo, tags e coleções para refinar a busca.
            </p>
          </div>
          <button class="btn-icon timeline-filters__close" id="timeline-filters-close"
            type="button" aria-label="Fechar filtros" title="Fechar filtros">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </header>

        <div class="timeline-filters__body">
          <section class="timeline-filter-section timeline-filter-section--period">
            <h3 class="timeline-filter-section__title">Período</h3>
            <div class="timeline-chip-group" id="timeline-date-presets"
              aria-label="Filtrar por período"></div>
            <div class="timeline-filters__row">
              <label class="timeline-filter-date">
                <span>De</span>
                <input type="date" id="timeline-from" aria-label="Data inicial" />
              </label>
              <label class="timeline-filter-date">
                <span>Até</span>
                <input type="date" id="timeline-to" aria-label="Data final" />
              </label>
            </div>
          </section>

          <section class="timeline-filter-section timeline-filter-section--content">
            <h3 class="timeline-filter-section__title">Conteúdo</h3>
            <div class="timeline-chip-group" id="timeline-type-filter"
              aria-label="Filtrar por tipo de conteúdo"></div>
          </section>

          <section class="timeline-filter-section timeline-filter-section--sort">
            <h3 class="timeline-filter-section__title">Ordenação</h3>
            <div class="timeline-chip-group" id="timeline-sort"
              aria-label="Ordenar resultados"></div>
          </section>

          <section class="timeline-filter-section timeline-filter-section--tags">
            <h3 class="timeline-filter-section__title">Tags</h3>
            <div class="timeline-tag-controls">
              <span class="timeline-filter-label">Combinação</span>
              <div class="timeline-chip-group" id="timeline-tag-mode"
                aria-label="Combinação de tags"></div>
              <div class="timeline-tag-search">
                <input type="search" id="timeline-tag-search"
                  aria-label="Buscar tags" placeholder="Buscar tag" autocomplete="off" />
              </div>
            </div>
            <div class="timeline-tag-filter" id="timeline-tag-filter"
              aria-label="Filtrar por tags"></div>
          </section>

          <section class="timeline-filter-section timeline-filter-section--chains">
            <h3 class="timeline-filter-section__title">Coleções</h3>
            <div class="timeline-chain-selector">
              <div class="timeline-chain-selector__toolbar">
                <div class="timeline-chain-search">
                  <input type="search" id="timeline-chain-search"
                    aria-label="Buscar coleções" placeholder="Buscar coleção" autocomplete="off" />
                </div>
                <button class="chip timeline-chain-all" id="timeline-chain-all"
                  type="button" aria-pressed="true">Todas</button>
              </div>
              <div class="chain-selector__list" id="timeline-chain-selector"
                aria-label="Coleções para timeline"></div>
            </div>
          </section>
        </div>

        <footer class="timeline-filters__footer">
          <button class="btn btn-text" id="timeline-filters-clear" type="button">
            Limpar filtros
          </button>
          <button class="btn btn-tonal" id="timeline-filters-done" type="button">
            Concluir
          </button>
        </footer>
      </div>
    </details>

    <div class="timeline-summary-row">
      <span class="timeline-result-count" id="timeline-result-count" aria-live="polite"></span>
      <button class="btn-icon timeline-note-select-toggle" id="timeline-note-select-toggle"
        type="button" aria-label="Selecionar notas" title="Selecionar notas" aria-pressed="false">
        <span class="material-symbols-rounded" aria-hidden="true">checklist</span>
      </button>
      <div class="timeline-chain-legend" id="timeline-chain-legend"
        aria-label="Coleções nos resultados"></div>
    </div>

    <div class="timeline-active-filters" id="timeline-active-filters"
      aria-label="Filtros ativos"></div>

    <div class="timeline-selection-bar" id="timeline-selection-bar" hidden>
      <label class="timeline-selection-all">
        <input type="checkbox" id="timeline-select-all" />
        <span>Todas</span>
      </label>
      <span class="timeline-selection-count" id="timeline-selection-count" aria-live="polite"></span>
      <div class="timeline-selection-tags" id="timeline-selection-tags"></div>
      <button class="btn btn-text" id="timeline-selection-cancel" type="button">Cancelar</button>
    </div>
  `;

  const searchRow = header.querySelector<HTMLElement>('.timeline-search-row')!;
  const filtersDetailsHost = header.querySelector<HTMLElement>(
    '#timeline-filters-details'
  )!;
  const clearButton = header.querySelector<HTMLElement>('#timeline-clear-filters')!;
  searchRow.append(filtersDetailsHost, clearButton);

  const summaryRow = header.querySelector<HTMLElement>('.timeline-summary-row')!;
  const activeFilters = header.querySelector<HTMLElement>('#timeline-active-filters')!;
  const chainLegend = header.querySelector<HTMLElement>('#timeline-chain-legend')!;
  summaryRow.insertBefore(activeFilters, chainLegend);
  const noteSelectToggle = header.querySelector<HTMLButtonElement>(
    '#timeline-note-select-toggle'
  )!;
  const selectAll = header.querySelector<HTMLInputElement>(
    '#timeline-select-all'
  )!;
  const tagEditorHost = header.querySelector<HTMLElement>(
    '#timeline-selection-tags'
  )!;
  const cancelSelection = header.querySelector<HTMLButtonElement>(
    '#timeline-selection-cancel'
  )!;

  noteSelectToggle.addEventListener('click', () => {
    if (appState.get().timelineNoteSelectionMode) {
      AppController.exitTimelineNoteSelection();
    } else {
      AppController.enterTimelineNoteSelection();
    }
  });
  cancelSelection.addEventListener('click', () => {
    AppController.exitTimelineNoteSelection();
  });
  selectAll.addEventListener('change', () => {
    const stateNow = appState.get();
    const ids = stateNow.timelineEntries.map((entry) => entry.note.id);
    AppController.setTimelineNoteSelection(selectAll.checked ? ids : []);
  });

  activeTimelineTagEditor = mountInlineTagEditor(
    tagEditorHost,
    {
      onAdd: (name) => AppController.assignTagToTimelineSelection(name),
      onRemove: () => {},
    },
    {
      addButtonText: 'Atribuir tag',
      addButtonAriaLabel: 'Atribuir tag às notas selecionadas',
      addButtonTitle: 'Atribuir tag às notas selecionadas',
      inputClassName: 'timeline-selection-tag-input',
      inputPlaceholder: 'Nova tag',
    }
  );
  activeTimelineTagEditor.update([], appState.get().allTags);

  header.prepend(renderNavToggle());
  layout.appendChild(header);

  const content = el('div', 'timeline-panel__content');
  const listColumn = el('div', 'timeline-list-column');
  const scrubber = el('div', 'timeline-scrubber');
  scrubber.setAttribute('role', 'group');
  scrubber.setAttribute('aria-label', 'Navegação por páginas da timeline');

  const pageLabel = el('span', 'timeline-slider-label');
  pageLabel.id = 'timeline-page-label';
  pageLabel.textContent = 'Todas as coleções';

  const sliderRow = el('div', 'timeline-slider-row');
  sliderRow.hidden = true;
  const slider = el('input', 'timeline-slider');
  slider.type = 'range';
  slider.id = 'timeline-slider';
  slider.min = '0';
  slider.max = '0';
  slider.step = '1';
  slider.value = '0';
  slider.disabled = true;
  slider.setAttribute(
    'aria-label',
    'Navegar pelas páginas da timeline'
  );
  sliderRow.appendChild(slider);
  scrubber.append(pageLabel, sliderRow);

  const list = el('div', 'timeline-panel__list');
  list.setAttribute('id', 'timeline-list');
  list.setAttribute('aria-live', 'polite');

  const preview = el('aside', 'timeline-preview');
  preview.id = 'timeline-preview';
  preview.setAttribute('aria-label', 'Prévia da nota');
  preview.hidden = true;

  listColumn.append(scrubber, list);
  content.append(listColumn, preview);
  layout.appendChild(content);

  const query = header.querySelector<HTMLInputElement>('#timeline-query')!;
  const from = header.querySelector<HTMLInputElement>('#timeline-from')!;
  const to = header.querySelector<HTMLInputElement>('#timeline-to')!;
  const clear = header.querySelector<HTMLButtonElement>('#timeline-clear-filters')!;
  const tagFilter = header.querySelector<HTMLElement>('#timeline-tag-filter')!;
  const tagSearch = header.querySelector<HTMLInputElement>('#timeline-tag-search')!;
  enableMagneticDragScroll(tagFilter, {
    draggingClass: 'timeline-tag-filter--dragging',
    snapSelector: '.timeline-tag-filter__chip',
  });
  const filtersDetails = header.querySelector<HTMLDetailsElement>(
    '#timeline-filters-details'
  )!;
  const filtersClose = header.querySelector<HTMLButtonElement>(
    '#timeline-filters-close'
  )!;
  const filtersDone = header.querySelector<HTMLButtonElement>(
    '#timeline-filters-done'
  )!;
  const filtersClear = header.querySelector<HTMLButtonElement>(
    '#timeline-filters-clear'
  )!;
  const chainSelector = header.querySelector<HTMLElement>('#timeline-chain-selector')!;
  const chainSearch = header.querySelector<HTMLInputElement>('#timeline-chain-search')!;
  const chainAll = header.querySelector<HTMLButtonElement>('#timeline-chain-all')!;
  const savedButton = header.querySelector<HTMLButtonElement>(
    '#timeline-saved-search'
  )!;
  const savedMenu = el('div', 'timeline-saved-menu');
  savedMenu.hidden = true;
  savedMenu.setAttribute('role', 'menu');
  savedMenu.setAttribute('aria-label', 'Buscas salvas');
  header.appendChild(savedMenu);

  const closeSavedMenu = (restoreFocus = false): void => {
    savedMenu.hidden = true;
    savedButton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onSavedMenuPointerDown, true);
    if (restoreFocus) savedButton.focus();
  };

  const onSavedMenuPointerDown = (event: PointerEvent): void => {
    if (!savedMenu.isConnected) {
      document.removeEventListener('pointerdown', onSavedMenuPointerDown, true);
      return;
    }
    if (savedMenu.hidden) return;
    if (event.target instanceof Node && savedMenu.contains(event.target)) return;
    if (event.target === savedButton) return;
    closeSavedMenu();
  };

  const saveCurrentSearch = async (): Promise<void> => {
    const name = await showInputDialog({
      title: 'Salvar busca',
      label: 'Nome da busca',
      placeholder: 'Ex.: Código recente com bug',
      confirmLabel: 'Salvar',
    });
    if (!name?.trim()) return;
    const stateNow = appState.get();
    const saved = saveTimelineSearch(
      name,
      stateNow.timelineFilters,
      stateNow.timelineSelectedChainIds
    );
    if (!saved) {
      snackbar.error('Não foi possível salvar a busca.');
      return;
    }
    snackbar.success('Busca salva.');
    renderSavedMenu();
    savedButton.focus();
  };

  const applySavedSearch = async (
    saved: SavedTimelineSearch
  ): Promise<void> => {
    closeSavedMenu();
    filtersDetails.open = false;
    await AppController.applyTimelineSearch(saved.filters, saved.chainIds);
  };

  function renderSavedMenu(): void {
    const savedSearches = getSavedTimelineSearches();
    const saveAction = el('button', 'timeline-saved-menu__save');
    saveAction.type = 'button';
    saveAction.setAttribute('role', 'menuitem');
    saveAction.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">bookmark_add</span><span>Salvar busca atual</span>';
    saveAction.addEventListener('click', () => void saveCurrentSearch());

    if (savedSearches.length === 0) {
      const empty = el('p', 'timeline-saved-menu__empty');
      empty.textContent = 'Nenhuma busca salva.';
      savedMenu.replaceChildren(saveAction, empty);
      return;
    }

    const items = savedSearches.map((saved) => {
      const row = el('div', 'timeline-saved-menu__item');
      const apply = el('button', 'timeline-saved-menu__apply');
      apply.type = 'button';
      apply.setAttribute('role', 'menuitem');
      apply.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">search</span>';
      const label = el('span', 'timeline-saved-menu__label');
      label.textContent = saved.name;
      apply.appendChild(label);
      apply.addEventListener('click', () => void applySavedSearch(saved));

      const remove = el('button', 'btn-icon timeline-saved-menu__remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Excluir busca ${saved.name}`);
      remove.title = 'Excluir busca';
      remove.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">delete</span>';
      remove.addEventListener('click', () => {
        deleteTimelineSearch(saved.id);
        renderSavedMenu();
        savedButton.focus();
      });

      row.append(apply, remove);
      return row;
    });

    savedMenu.replaceChildren(saveAction, ...items);
  }

  const openSavedMenu = (): void => {
    renderSavedMenu();
    savedMenu.hidden = false;
    savedButton.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onSavedMenuPointerDown, true);
    savedMenu.querySelector<HTMLElement>('button')?.focus();
  };

  savedButton.addEventListener('click', () => {
    if (savedMenu.hidden) openSavedMenu();
    else closeSavedMenu(true);
  });

  savedMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSavedMenu(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [
      ...savedMenu.querySelectorAll<HTMLElement>('button'),
    ];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'ArrowDown'
        ? Math.min(items.length - 1, index + 1)
        : Math.max(0, index - 1);
    items[nextIndex]?.focus();
  });

  query.addEventListener('input', () => {
    if (queryTimer) clearTimeout(queryTimer);
    queryTimer = setTimeout(() => {
      if (!document.getElementById('timeline-query')) return;
      void AppController.updateTimelineFilters({ query: query.value });
    }, 300);
  });

  from.addEventListener('change', () => {
    void AppController.updateTimelineFilters({ from: from.value });
  });
  to.addEventListener('change', () => {
    void AppController.updateTimelineFilters({ to: to.value });
  });
  clear.addEventListener('click', () => {
    query.value = '';
    from.value = '';
    to.value = '';
    tagSearch.value = '';
    void AppController.clearTimelineFilters();
  });

  const closeFilters = (): void => {
    filtersDetails.open = false;
    filtersDetails
      .querySelector<HTMLElement>('summary')
      ?.focus();
  };

  filtersClose.addEventListener('click', closeFilters);
  filtersDone.addEventListener('click', closeFilters);
  filtersClear.addEventListener('click', () => {
    query.value = '';
    from.value = '';
    to.value = '';
    tagSearch.value = '';
    void AppController.clearTimelineFilters();
  });

  const onDetailsPointerDown = (event: PointerEvent): void => {
    if (!filtersDetails.isConnected) {
      document.removeEventListener('pointerdown', onDetailsPointerDown, true);
      document.removeEventListener('keydown', onDetailsKeyDown, true);
      return;
    }
    if (!filtersDetails.open) return;
    if (event.target instanceof Node && filtersDetails.contains(event.target)) return;
    filtersDetails.open = false;
  };
  const onDetailsKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !filtersDetails.open) return;
    filtersDetails.open = false;
    filtersDetails.querySelector<HTMLElement>('summary')?.focus();
  };
  filtersDetails.addEventListener('toggle', () => {
    if (filtersDetails.open) {
      document.addEventListener('pointerdown', onDetailsPointerDown, true);
      document.addEventListener('keydown', onDetailsKeyDown, true);
    } else {
      document.removeEventListener('pointerdown', onDetailsPointerDown, true);
      document.removeEventListener('keydown', onDetailsKeyDown, true);
    }
  });

  header
    .querySelector<HTMLElement>('#timeline-date-presets')
    ?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-date-preset]'
      );
      if (!button) return;
      const preset = DATE_PRESETS.find(
        (item) => item.value === button.dataset['datePreset']
      );
      if (!preset) return;
      if (preset.days === null) {
        void AppController.updateTimelineFilters({ from: '', to: '' });
        return;
      }
      const range = datePresetRange(preset.days);
      void AppController.updateTimelineFilters(range);
    });

  header
    .querySelector<HTMLElement>('#timeline-type-filter')
    ?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-content-type]'
      );
      if (!button) return;
      const value = button.dataset['contentType'];
      if (!value) return;
      const current = appState.get().timelineFilters.contentTypes ?? [];
      const next =
        value === 'all'
          ? []
          : current.includes(value as NoteContentType)
            ? current.filter((item) => item !== value)
            : [...current, value as NoteContentType];
      void AppController.updateTimelineFilters({ contentTypes: next });
    });

  header
    .querySelector<HTMLElement>('#timeline-sort')
    ?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-sort]'
      );
      const sort = button?.dataset['sort'];
      if (sort !== 'newest' && sort !== 'oldest') return;
      void AppController.updateTimelineFilters({ sort });
    });

  header
    .querySelector<HTMLElement>('#timeline-tag-mode')
    ?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-tag-mode]'
      );
      const tagMode = button?.dataset['tagMode'];
      if (tagMode !== 'any' && tagMode !== 'all') return;
      void AppController.updateTimelineFilters({ tagMode });
    });

  header
    .querySelector<HTMLElement>('#timeline-active-filters')
    ?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-filter-kind]'
      );
      if (!button) return;
      const kind = button.dataset['filterKind'];
      const value = button.dataset['filterValue'] ?? '';
      const filters = appState.get().timelineFilters;

      if (kind === 'query') {
        query.value = '';
        void AppController.updateTimelineFilters({ query: '' });
      } else if (kind === 'date') {
        from.value = '';
        to.value = '';
        void AppController.updateTimelineFilters({ from: '', to: '' });
      } else if (kind === 'tag') {
        void AppController.updateTimelineFilters({
          tagIds: filters.tagIds.filter((tagId) => tagId !== value),
        });
      } else if (kind === 'type') {
        void AppController.updateTimelineFilters({
          contentTypes: (filters.contentTypes ?? []).filter(
            (type) => type !== value
          ),
        });
      } else if (kind === 'chain') {
        void AppController.updateTimelineSelection(
          appState
            .get()
            .timelineSelectedChainIds.filter((chainId) => chainId !== value)
        );
      }
    });

  tagSearch.addEventListener('input', () => {
    renderTagChips(header, appState.get(), tagSearch.value);
  });

  tagFilter.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-tag-id]'
    );
    if (!button) return;
    const tagId = button.dataset['tagId'];
    if (!tagId) return;
    const current = appState.get().timelineFilters.tagIds;
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    void AppController.updateTimelineFilters({ tagIds: next });
  });

  chainSearch.addEventListener('input', () => {
    renderChainSelector(chainSelector, appState.get(), chainSearch.value);
  });

  chainAll.addEventListener('click', () => {
    void AppController.updateTimelineSelection([]);
  });

  chainSelector.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-chain-id]'
    );
    if (!item) return;
    const chainId = item.dataset['chainId'];
    if (!chainId) return;
    const current = appState.get().timelineSelectedChainIds;
    const next = current.includes(chainId)
      ? current.filter((id) => id !== chainId)
      : [...current, chainId];
    void AppController.updateTimelineSelection(next);
  });

  chainSelector.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const item = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-chain-id]'
    );
    if (!item) return;
    event.preventDefault();
    item.click();
  });

  let sliderSeekTimer: ReturnType<typeof setTimeout> | null = null;
  const setSliderAdjusting = (active: boolean): void => {
    if (active) slider.dataset['adjusting'] = 'true';
    else delete slider.dataset['adjusting'];
  };
  const seekSliderPage = (immediate: boolean): void => {
    const totalPages = Math.max(1, Number(slider.max) + 1);
    const page = Math.max(
      0,
      Math.min(totalPages - 1, Math.round(Number(slider.value)))
    );
    setTimelineSliderLabel(slider, pageLabel, page, totalPages);
    if (sliderSeekTimer !== null) {
      clearTimeout(sliderSeekTimer);
      sliderSeekTimer = null;
    }
    const commit = (): void => {
      setSliderAdjusting(false);
      markTimelineProgrammaticScroll(list);
      list.scrollTop = 0;
      void AppController.seekTimelinePage(page);
    };
    if (immediate) {
      commit();
      return;
    }
    sliderSeekTimer = setTimeout(() => {
      sliderSeekTimer = null;
      commit();
    }, 120);
  };

  slider.addEventListener('pointerdown', () => setSliderAdjusting(true));
  slider.addEventListener('input', () => {
    setSliderAdjusting(true);
    seekSliderPage(false);
  });
  slider.addEventListener('change', () => seekSliderPage(true));
  slider.addEventListener('blur', () => setSliderAdjusting(false));

  let lastTimelineScrollTop = list.scrollTop;
  let timelineSearchHidden = false;
  let timelineSearchFrame: number | null = null;

  const setTimelineSearchHidden = (hidden: boolean): void => {
    if (timelineSearchHidden === hidden) return;
    timelineSearchHidden = hidden;
    layout.classList.toggle('timeline-panel--search-hidden', hidden);
  };

  const syncTimelineSearchVisibility = (): void => {
    if (timelineSearchFrame !== null) return;
    timelineSearchFrame = requestAnimationFrame(() => {
      timelineSearchFrame = null;
      if (!list.isConnected) return;

      const current = list.scrollTop;
      const delta = current - lastTimelineScrollTop;
      lastTimelineScrollTop = current;

      if (
        performance.now() <
        (timelineScrollIgnoreUntil.get(list) ?? 0)
      ) {
        return;
      }

      if (
        current <= 8 ||
        searchRow.contains(document.activeElement) ||
        filtersDetails.open
      ) {
        setTimelineSearchHidden(false);
        return;
      }

      if (delta > 4) setTimelineSearchHidden(true);
      else if (delta < -4) setTimelineSearchHidden(false);
    });
  };

  list.addEventListener('scroll', () => {
    syncTimelineSliderFromScroll(
      list,
      slider,
      pageLabel,
      appState.get()
    );
    syncTimelineSearchVisibility();
    if (list.scrollTop < 120) {
      void AppController.loadPreviousTimeline();
    }
    if (list.scrollTop + list.clientHeight < list.scrollHeight - 120) return;
    void AppController.loadMoreTimeline();
  });

  list.addEventListener('keydown', (event) => {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }
    const row = (event.target as HTMLElement).closest<HTMLElement>(
      '.timeline-entry'
    );
    if (!row) return;
    event.preventDefault();
    const rows = [
      ...list.querySelectorAll<HTMLElement>('.timeline-entry'),
    ];
    const current = rows.indexOf(row);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? rows.length - 1
          : event.key === 'ArrowDown'
            ? Math.min(rows.length - 1, current + 1)
            : Math.max(0, current - 1);
    rows[next]?.focus();
  });

  layout.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !appState.get().timelineNoteSelectionMode) {
      return;
    }
    const target = event.target as Element | null;
    if (
      target?.closest('#timeline-filters-details, .dialog-backdrop, .timeline-saved-menu')
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    AppController.exitTimelineNoteSelection();
  });

  renderTimelineFilters(header, state);
  renderChainSelector(chainSelector, state, '');
  updateTimelineEntries(list, state);
  updateTimelineSummary(header, state);
  updateTimelineSelectionUi(header, state);
  updateTimelineSlider(slider, pageLabel, state);
  syncTimelineSliderFromScroll(list, slider, pageLabel, state);
  renderTimelinePreview(preview, state);
  return layout;
}

export function updateTimelineLayout(content: HTMLElement, state: AppState): void {
  const header = qs('.timeline-panel__header', content);
  const list = qs('#timeline-list', content);
  if (!header || !list) return;

  const preview = qs<HTMLElement>('#timeline-preview', content);
  const previewChanged =
    timelinePreviewId(list) !== state.timelinePreviewNoteId;
  const selectionModeMatches =
    list.dataset['selectionMode'] === String(state.timelineNoteSelectionMode);
  if (
    preview &&
    previewChanged &&
    selectionModeMatches &&
    timelineEntriesMatch(list, state)
  ) {
    updateTimelineEntrySelection(list, state.timelinePreviewNoteId);
    updateTimelineSelectionUi(header, state);
    renderTimelinePreview(preview, state);
    return;
  }

  renderTimelineFilters(header, state);
  const chainSelector = qs<HTMLElement>('#timeline-chain-selector', header);
  const chainSearch = qs<HTMLInputElement>('#timeline-chain-search', header);
  if (chainSelector) {
    renderChainSelector(chainSelector, state, chainSearch?.value ?? '');
  }
  const previewAnchor = captureTimelinePreviewAnchor(list, state);
  if (preview) renderTimelinePreview(preview, state);
  updateTimelineEntries(list, state, previewAnchor);
  updateTimelineSummary(header, state);
  updateTimelineSelectionUi(header, state);
  const slider = qs<HTMLInputElement>('#timeline-slider', content);
  const pageLabel = qs<HTMLElement>('#timeline-page-label', content);
  if (slider && pageLabel) {
    updateTimelineSlider(slider, pageLabel, state);
    syncTimelineSliderFromScroll(list, slider, pageLabel, state);
  }
}

function renderTimelineFilters(header: HTMLElement, state: AppState): void {
  const filters = state.timelineFilters;
  const contentTypes = filters.contentTypes ?? [];
  const query = qs<HTMLInputElement>('#timeline-query', header);
  const from = qs<HTMLInputElement>('#timeline-from', header);
  const to = qs<HTMLInputElement>('#timeline-to', header);

  if (query && document.activeElement !== query && query.value !== filters.query) {
    query.value = filters.query;
  }
  if (from && document.activeElement !== from && from.value !== filters.from) {
    from.value = filters.from;
  }
  if (to && document.activeElement !== to && to.value !== filters.to) {
    to.value = filters.to;
  }

  const datePresets = qs<HTMLElement>('#timeline-date-presets', header);
  if (datePresets) {
    datePresets.replaceChildren(
      ...DATE_PRESETS.map((preset) => {
        const active = isDatePresetActive(filters, preset.days);
        const button = el(
          'button',
          `chip timeline-chip${active ? ' chip--selected' : ''}`
        );
        button.type = 'button';
        button.dataset['datePreset'] = preset.value;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.textContent = preset.label;
        return button;
      })
    );
  }

  const typeFilter = qs<HTMLElement>('#timeline-type-filter', header);
  if (typeFilter) {
    const all = el(
      'button',
      `chip timeline-chip${contentTypes.length === 0 ? ' chip--selected' : ''}`
    );
    all.type = 'button';
    all.dataset['contentType'] = 'all';
    all.setAttribute(
      'aria-pressed',
      contentTypes.length === 0 ? 'true' : 'false'
    );
    all.textContent = 'Todos';
    typeFilter.replaceChildren(
      all,
      ...CONTENT_TYPES.map((item) => {
        const active = contentTypes.includes(item.value);
        const button = el(
          'button',
          `chip timeline-chip${active ? ' chip--selected' : ''}`
        );
        button.type = 'button';
        button.dataset['contentType'] = item.value;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.textContent = item.label;
        return button;
      })
    );
  }

  const sortFilter = qs<HTMLElement>('#timeline-sort', header);
  if (sortFilter) {
    const activeSort = filters.sort ?? 'newest';
    sortFilter.replaceChildren(
      ...(
        [
          ['newest', 'Mais recentes'],
          ['oldest', 'Mais antigas'],
          ['relevance', 'Relevância'],
        ] as const
      ).map(([value, label]) => {
        const active = activeSort === value;
        const button = el(
          'button',
          `chip timeline-chip${active ? ' chip--selected' : ''}`
        );
        button.type = 'button';
        button.dataset['sort'] = value;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (value === 'relevance' && !filters.query.trim()) {
          button.disabled = true;
          button.title = 'Digite um termo para ordenar por relevância';
        }
        button.textContent = label;
        return button;
      })
    );
  }

  const tagMode = qs<HTMLElement>('#timeline-tag-mode', header);
  if (tagMode) {
    const activeMode = filters.tagMode ?? 'any';
    tagMode.replaceChildren(
      ...(
        [
          ['any', 'Qualquer tag'],
          ['all', 'Todas as tags'],
        ] as const
      ).map(([value, label]) => {
        const active = activeMode === value;
        const button = el(
          'button',
          `chip timeline-chip${active ? ' chip--selected' : ''}`
        );
        button.type = 'button';
        button.dataset['tagMode'] = value;
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.textContent = label;
        return button;
      })
    );
  }

  renderTagChips(
    header,
    state,
    qs<HTMLInputElement>('#timeline-tag-search', header)?.value ?? ''
  );

  renderActiveFilters(header, state);
  updateChainScopeButton(header, state);
}

function compareTagsByFrequency(a: TagDTO, b: TagDTO): number {
  const noteCountA = a.noteCount ?? 0;
  const noteCountB = b.noteCount ?? 0;
  const totalA = noteCountA + a.chainCount;
  const totalB = noteCountB + b.chainCount;

  if (totalA !== totalB) return totalB - totalA;
  if (a.chainCount !== b.chainCount) return b.chainCount - a.chainCount;
  return 0;
}

function renderTagChips(
  header: HTMLElement,
  state: AppState,
  search: string
): void {
  const tagsHost = qs<HTMLElement>('#timeline-tag-filter', header);
  if (!tagsHost) return;

  const normalized = normalizeText(search);
  const tags = state.allTags
    .filter((tag) => !normalized || normalizeText(tag.name).includes(normalized))
    .sort(compareTagsByFrequency);
  tagsHost.replaceChildren(
    ...tags.map((tag) => renderTagFilter(tag, state.timelineFilters))
  );

  if (tags.length === 0) {
    const empty = el('p', 'timeline-tag-filter__empty');
    empty.textContent = state.allTags.length
      ? 'Nenhuma tag encontrada.'
      : 'Nenhuma tag cadastrada.';
    tagsHost.appendChild(empty);
  }
}

function renderTagFilter(tag: TagDTO, filters: TimelineFilters): HTMLElement {
  const selected = filters.tagIds.includes(tag.id);
  const button = el(
    'button',
    `chip timeline-tag-filter__chip${selected ? ' chip--selected' : ''}`
  );
  button.type = 'button';
  button.dataset['tagId'] = tag.id;
  button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  button.textContent = tag.name;
  return button;
}

function renderActiveFilters(header: HTMLElement, state: AppState): void {
  const host = qs<HTMLElement>('#timeline-active-filters', header);
  if (!host) return;

  const filters = state.timelineFilters;
  const chips: HTMLElement[] = [];

  const add = (kind: string, value: string, label: string): void => {
    const chip = el('button', 'chip chip--selected timeline-active-filter');
    chip.type = 'button';
    chip.dataset['filterKind'] = kind;
    chip.dataset['filterValue'] = value;
    chip.setAttribute('aria-label', `Remover filtro ${label}`);
    chip.append(document.createTextNode(label));
    const icon = el('span', 'material-symbols-rounded');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'close';
    chip.appendChild(icon);
    chips.push(chip);
  };

  if (filters.query) add('query', filters.query, `Busca: ${filters.query}`);
  if (filters.from || filters.to) {
    const range = [formatFilterDate(filters.from), formatFilterDate(filters.to)]
      .filter(Boolean)
      .join(' até ');
    add('date', '', range || 'Data');
  }
  filters.tagIds.forEach((tagId) => {
    const tag = state.allTags.find((item) => item.id === tagId);
    if (tag) add('tag', tag.id, tag.name);
  });
  (filters.contentTypes ?? []).forEach((type) => {
    add('type', type, contentTypeLabel(type));
  });
  state.timelineSelectedChainIds.forEach((chainId) => {
    const chain = state.chainSummaries.find((item) => item.id === chainId);
    if (chain) add('chain', chain.id, chain.displayTitle);
  });

  const activeCount = chips.length;
  if (activeCount > 0) {
    const clearAll = el('button', 'chip timeline-active-filter__clear');
    clearAll.type = 'button';
    clearAll.textContent = 'Limpar tudo';
    clearAll.addEventListener('click', () => {
      void AppController.clearTimelineFilters();
    });
    chips.push(clearAll);
  }

  host.replaceChildren(...chips);
  host.hidden = chips.length === 0;

  const count = qs<HTMLElement>('#timeline-filter-count', header);
  if (count) {
    count.textContent = String(activeCount);
    count.hidden = activeCount === 0;
  }
}

function updateChainScopeButton(header: HTMLElement, state: AppState): void {
  const button = qs<HTMLButtonElement>('#timeline-chain-all', header);
  if (!button) return;
  const all = state.timelineSelectedChainIds.length === 0;
  button.classList.toggle('chip--selected', all);
  button.setAttribute('aria-pressed', all ? 'true' : 'false');
}

function renderChainSelector(
  container: HTMLElement,
  state: AppState,
  search: string
): void {
  const colors = getTimelineChainColors(
    state.chainSummaries.map((chain) => chain.id)
  );
  const normalized = normalizeText(search);
  const chains = state.chainSummaries.filter(
    (chain) =>
      !normalized || normalizeText(chain.displayTitle).includes(normalized)
  );

  container.replaceChildren(
    ...chains.map((chain) =>
      renderChainSelectorItem(
        chain,
        state.timelineSelectedChainIds.includes(chain.id),
        colors.get(chain.id) ?? 'var(--md-sys-color-outline-variant)'
      )
    )
  );

  if (chains.length === 0) {
    const empty = el('p', 'timeline-chain-selector__empty');
    empty.textContent = 'Nenhuma coleção encontrada.';
    container.appendChild(empty);
  }
}

function renderChainSelectorItem(
  chain: ChainSummaryDTO,
  isSelected: boolean,
  color: string
): HTMLElement {
  const item = el(
    'div',
    `chain-selector-item${isSelected ? ' chain-selector-item--selected' : ''}`
  );
  item.setAttribute('tabindex', '0');
  item.setAttribute('role', 'checkbox');
  item.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  item.setAttribute('aria-label', chain.displayTitle);
  item.dataset['chainId'] = chain.id;

  const swatch = el('span', 'timeline-chain-swatch');
  swatch.setAttribute('aria-hidden', 'true');
  swatch.style.backgroundColor = color;

  const check = el('div', 'chain-selector-item__check');
  if (isSelected) {
    const icon = el('span', 'material-symbols-rounded');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'check';
    check.appendChild(icon);
  }

  const title = el('span', 'chain-selector-item__title');
  title.textContent = chain.displayTitle;

  const count = el('span', 'chain-selector-item__count');
  count.textContent = `${chain.noteCount} notas`;

  item.append(swatch, check, title, count);
  return item;
}

function updateTimelineSelectionUi(header: HTMLElement, state: AppState): void {
  const toggle = qs<HTMLButtonElement>('#timeline-note-select-toggle', header);
  const bar = qs<HTMLElement>('#timeline-selection-bar', header);
  const selectAll = qs<HTMLInputElement>('#timeline-select-all', header);
  const count = qs<HTMLElement>('#timeline-selection-count', header);
  const tagHost = qs<HTMLElement>('#timeline-selection-tags', header);
  if (!toggle || !bar || !selectAll || !count || !tagHost) return;

  const loadedIds = state.timelineEntries.map((entry) => entry.note.id);
  const selected = new Set(state.timelineSelectedNoteIds);
  const loadedSelected = loadedIds.filter((id) => selected.has(id)).length;
  const active = state.timelineNoteSelectionMode;

  toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
  toggle.setAttribute(
    'aria-label',
    active ? 'Cancelar seleção de notas' : 'Selecionar notas'
  );
  toggle.title = active ? 'Cancelar seleção de notas' : 'Selecionar notas';
  toggle.classList.toggle('btn-icon--active', active);
  header.classList.toggle('timeline-panel--selection', active);
  bar.hidden = !active;

  selectAll.checked = loadedIds.length > 0 && loadedSelected === loadedIds.length;
  selectAll.indeterminate =
    loadedSelected > 0 && loadedSelected < loadedIds.length;
  count.textContent = `${loadedSelected} de ${loadedIds.length} ${
    loadedIds.length === 1 ? 'nota selecionada' : 'notas selecionadas'
  }`;
  tagHost.hidden = loadedSelected === 0;
  activeTimelineTagEditor?.update([], state.allTags);
}

function updateTimelineSummary(header: HTMLElement, state: AppState): void {
  const count = qs<HTMLElement>('#timeline-result-count', header);
  if (count) {
    const scope = state.timelineSelectedChainIds.length
      ? `${state.timelineSelectedChainIds.length} ${
          state.timelineSelectedChainIds.length === 1 ? 'coleção' : 'coleções'
        }`
      : 'todas as coleções';
    count.textContent = state.isLoading
      ? 'Buscando notas…'
      : `${state.timelineTotal} ${
          state.timelineTotal === 1 ? 'nota' : 'notas'
        } em ${scope}`;
  }

  const legend = qs<HTMLElement>('#timeline-chain-legend', header);
  if (!legend) return;

  const colors = getTimelineChainColors(
    state.chainSummaries.map((chain) => chain.id)
  );
  const seen = new Set<string>();
  const items: HTMLElement[] = [];

  state.timelineEntries.forEach((entry) => {
    if (seen.has(entry.chainId)) return;
    seen.add(entry.chainId);
    const chain = state.chainSummaries.find((item) => item.id === entry.chainId);
    if (!chain) return;

    const item = el('span', 'timeline-legend-item');
    const dot = el('span', 'timeline-chain-swatch');
    dot.setAttribute('aria-hidden', 'true');
    dot.style.backgroundColor =
      colors.get(chain.id) ?? 'var(--md-sys-color-outline-variant)';
    const label = el('span', 'timeline-legend-item__label');
    label.textContent = chain.displayTitle;
    item.append(dot, label);
    items.push(item);
  });

  legend.replaceChildren(...items);
  legend.hidden = items.length === 0;
}

function renderTimelinePreview(host: HTMLElement, state: AppState): void {
  const entry =
    state.timelinePreviewNoteId === null
      ? undefined
      : state.timelineEntries.find(
          (item) => item.note.id === state.timelinePreviewNoteId
        );

  if (!entry) {
    host.hidden = true;
    host.setAttribute('inert', '');
    return;
  }
  host.removeAttribute('inert');

  const colors = getTimelineChainColors(
    state.chainSummaries.map((chain) => chain.id)
  );
  const accent =
    colors.get(entry.chainId) ?? 'var(--md-sys-color-outline-variant)';

  renderNotePreview(host, entry, {
    query: state.timelineFilters.query,
    accent,
    onClose: () => appState.set({ timelinePreviewNoteId: null }),
    action: {
      label: 'Abrir coleção',
      icon: 'open_in_new',
      onClick: () => {
        void AppController.openTimelineResult(
          entry.chainId,
          entry.note.id,
          state.timelineFilters.query
        );
      },
    },
  });
}

function updateTimelineSliderProgress(slider: HTMLInputElement): void {
  const max = Number(slider.max) || 0;
  const value = Number(slider.value) || 0;
  const progress =
    max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  slider.style.setProperty('--timeline-slider-progress', `${progress}%`);
}

type TimelineSliderPeriod = {
  start: string;
  end?: string;
};

function timelineSliderDateElement(iso: string): HTMLElement {
  const date = new Date(iso);
  const wrapper = el('span', 'timeline-slider-date');
  const day = el('span', 'timeline-slider-date__day');
  const month = el('span', 'timeline-slider-date__month');

  day.textContent = String(date.getDate()).padStart(2, '0');
  month.textContent = date
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
  wrapper.append(day, document.createTextNode(' '), month);

  if (date.getFullYear() !== new Date().getFullYear()) {
    const year = el('span', 'timeline-slider-date__year');
    year.textContent = String(date.getFullYear());
    wrapper.append(document.createTextNode(' '), year);
  }

  return wrapper;
}

function setTimelineSliderLabel(
  slider: HTMLInputElement,
  label: HTMLElement,
  pageIndex: number,
  totalPages: number,
  period: TimelineSliderPeriod | null = null
): void {
  const page = el('span', 'timeline-slider-page');
  page.textContent = `Página ${pageIndex + 1} de ${totalPages}`;
  label.replaceChildren(page);

  if (period) {
    const separator = el('span', 'timeline-slider-label__separator');
    separator.textContent = ' · ';
    const periodElement = el('span', 'timeline-slider-period');
    periodElement.appendChild(timelineSliderDateElement(period.start));

    if (period.end && period.end !== period.start) {
      const dash = el('span', 'timeline-slider-period__dash');
      dash.textContent = ' – ';
      periodElement.append(
        dash,
        timelineSliderDateElement(period.end)
      );
    }

    label.append(separator, periodElement);
  }

  const text = label.textContent?.trim() ?? '';
  slider.setAttribute('aria-valuetext', text);
  slider.title = text;
  updateTimelineSliderProgress(slider);
}

function updateTimelineSlider(
  slider: HTMLInputElement,
  label: HTMLElement,
  state: AppState
): void {
  const totalPages = Math.max(
    1,
    Math.ceil(state.timelineTotal / state.timelinePageSize)
  );
  const hidden = state.timelineTotal === 0;
  const disabled = hidden || totalPages <= 1;

  slider.max = String(Math.max(0, totalPages - 1));
  slider.step = '1';
  if (slider.dataset['adjusting'] !== 'true') {
    slider.value = String(
      Math.min(Math.max(0, state.timelinePageIndex), totalPages - 1)
    );
  }
  slider.disabled = disabled;
  const row = slider.closest<HTMLElement>('.timeline-slider-row');
  if (row) row.hidden = hidden;

  if (state.chainSummaries.length === 0) {
    label.textContent = 'Nenhuma coleção cadastrada';
    return;
  }
  if (!state.timelineTotal) {
    label.textContent = 'Nenhuma nota encontrada';
    return;
  }
  if (slider.dataset['adjusting'] === 'true') return;

  const first = state.timelineEntries[0];
  const last = state.timelineEntries[state.timelineEntries.length - 1];
  const period = first
    ? {
        start: first.note.createdAt,
        ...(last && last !== first
          ? { end: last.note.createdAt }
          : {}),
      }
    : null;

  setTimelineSliderLabel(
    slider,
    label,
    state.timelinePageIndex,
    totalPages,
    period
  );
}

function syncTimelineSliderFromScroll(
  container: HTMLElement,
  slider: HTMLInputElement,
  label: HTMLElement,
  state: AppState
): void {
  if (
    !state.timelineTotal ||
    state.timelineEntries.length === 0 ||
    slider.dataset['adjusting'] === 'true'
  ) {
    return;
  }

  const totalPages = Math.max(
    1,
    Math.ceil(state.timelineTotal / state.timelinePageSize)
  );
  const scrollable = Math.max(
    0,
    container.scrollHeight - container.clientHeight
  );
  const ratio =
    scrollable > 0
      ? Math.max(0, Math.min(1, container.scrollTop / scrollable))
      : 0;
  const localIndex = Math.min(
    state.timelineEntries.length - 1,
    Math.max(0, Math.round(ratio * (state.timelineEntries.length - 1)))
  );
  const absoluteIndex = state.timelineLoadedOffset + localIndex;
  const pageSize = Math.max(1, state.timelinePageSize);
  const pageIndex = Math.min(
    totalPages - 1,
    Math.floor(absoluteIndex / pageSize)
  );
  const entry = state.timelineEntries[localIndex];

  slider.value = String(pageIndex);
  setTimelineSliderLabel(
    slider,
    label,
    pageIndex,
    totalPages,
    entry ? { start: entry.note.createdAt } : null
  );
}

type TimelinePreviewAnchor = {
  noteId: string;
  offset: number;
};

function timelinePreviewId(container: HTMLElement): string | null {
  return (
    container.querySelector<HTMLElement>('.timeline-entry--selected')
      ?.dataset['noteId'] ?? null
  );
}

function timelineFilterSignature(state: AppState): string {
  return JSON.stringify({
    filters: state.timelineFilters,
    chains: state.timelineSelectedChainIds,
    offset: state.timelineLoadedOffset,
    pageSize: state.timelinePageSize,
    total: state.timelineTotal,
  });
}

function timelineEntriesMatch(
  container: HTMLElement,
  state: AppState
): boolean {
  if (
    container.dataset['filterSignature'] !== timelineFilterSignature(state)
  ) {
    return false;
  }

  const rows = container.querySelectorAll<HTMLElement>('.timeline-entry');
  if (rows.length !== state.timelineEntries.length) return false;

  return state.timelineEntries.every(
    (entry, index) => rows[index]?.dataset['noteId'] === entry.note.id
  );
}

function updateTimelineEntrySelection(
  container: HTMLElement,
  previewNoteId: string | null
): void {
  container.querySelectorAll<HTMLElement>('.timeline-entry').forEach((row) => {
    const selected = row.dataset['noteId'] === previewNoteId;
    row.classList.toggle('timeline-entry--selected', selected);
    row.setAttribute('aria-current', selected ? 'true' : 'false');
  });
}

function captureTimelinePreviewAnchor(
  container: HTMLElement,
  state: AppState
): TimelinePreviewAnchor | null {
  const currentId =
    container.querySelector<HTMLElement>('.timeline-entry--selected')?.dataset[
      'noteId'
    ] ?? null;
  if (currentId === state.timelinePreviewNoteId) return null;

  const noteId = state.timelinePreviewNoteId ?? currentId;
  if (!noteId) return null;

  const row = Array.from(
    container.querySelectorAll<HTMLElement>('.timeline-entry')
  ).find((item) => item.dataset['noteId'] === noteId);
  if (!row) return null;

  return {
    noteId,
    offset: row.getBoundingClientRect().top -
      container.getBoundingClientRect().top,
  };
}

function updateTimelineEntries(
  container: HTMLElement,
  state: AppState,
  previewAnchor: TimelinePreviewAnchor | null = null
): void {
  const previousScroll = container.scrollTop;
  const previousHeight = container.scrollHeight;
  const previousOffset = Number(
    container.dataset['loadedOffset'] ?? state.timelineLoadedOffset
  );
  const wasNearBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 120;
  const isPrepending = state.timelineLoadedOffset < previousOffset;
  const containerTop = container.getBoundingClientRect().top;
  const anchor = isPrepending
    ? Array.from(
        container.querySelectorAll<HTMLElement>('.timeline-entry')
      ).find((row) => row.getBoundingClientRect().bottom > containerTop)
    : undefined;
  const anchorId = anchor?.dataset['noteId'];
  const anchorOffset = anchor
    ? anchor.getBoundingClientRect().top - containerTop
    : 0;

  container.innerHTML = '';
  container.dataset['loadedOffset'] = String(state.timelineLoadedOffset);
  container.dataset['filterSignature'] = timelineFilterSignature(state);
  container.dataset['selectionMode'] = String(state.timelineNoteSelectionMode);

  if (state.isLoading && state.timelineEntries.length === 0) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (state.chainSummaries.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'timeline',
        'Nenhuma coleção cadastrada',
        'Crie uma coleção para começar a buscar nas notas.'
      )
    );
    return;
  }

  if (state.timelineEntries.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'search_off',
        'Nenhuma nota encontrada',
        'Ajuste os filtros ou tente outro termo de busca.'
      )
    );
    return;
  }

  const colors = getTimelineChainColors(
    state.chainSummaries.map((chain) => chain.id)
  );
  renderEntries(
    container,
    state.timelineEntries,
    colors,
    state.timelineFilters.query,
    state.timelinePreviewNoteId,
    state.timelineNoteSelectionMode,
    new Set(state.timelineSelectedNoteIds)
  );

  if (state.timelineIsLoadingMore) {
    const loading = el('div', 'timeline-loading-more');
    loading.setAttribute('role', 'status');
    loading.textContent = 'Carregando mais…';
    container.appendChild(loading);
  } else if (
    state.timelineLoadedOffset + state.timelineEntries.length <
    state.timelineTotal
  ) {
    const hint = el('div', 'timeline-load-more-hint');
    hint.textContent = 'Role para carregar mais';
    container.appendChild(hint);
  }

  markTimelineProgrammaticScroll(container);

  if (isPrepending) {
    const nextAnchor = anchorId
      ? Array.from(
          container.querySelectorAll<HTMLElement>('.timeline-entry')
        ).find((row) => row.dataset['noteId'] === anchorId)
      : undefined;
    if (nextAnchor) {
      const nextOffset =
        nextAnchor.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
      container.scrollTop = Math.max(
        0,
        previousScroll + nextOffset - anchorOffset
      );
    } else {
      container.scrollTop =
        previousScroll + Math.max(0, container.scrollHeight - previousHeight);
    }
    return;
  }

  if (state.timelineLoadedOffset > previousOffset && wasNearBottom) {
    container.scrollTop = container.scrollHeight;
  } else {
    container.scrollTop = previousScroll;
  }

  if (previewAnchor) {
    const nextAnchor = Array.from(
      container.querySelectorAll<HTMLElement>('.timeline-entry')
    ).find((row) => row.dataset['noteId'] === previewAnchor.noteId);
    if (nextAnchor) {
      const nextOffset =
        nextAnchor.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
      container.scrollTop = Math.max(
        0,
        container.scrollTop + nextOffset - previewAnchor.offset
      );
    }
  }
}

function renderEntries(
  container: HTMLElement,
  entries: TimelineEntryDTO[],
  colors: Map<string, string>,
  query: string,
  previewNoteId: string | null,
  selectionMode: boolean,
  selectedNoteIds: ReadonlySet<string>
): void {
  let lastDate = '';
  let group: HTMLElement | null = null;

  entries.forEach((entry) => {
    const dateStr = new Date(entry.note.createdAt).toLocaleDateString('pt-BR');
    if (dateStr !== lastDate || !group) {
      lastDate = dateStr;
      group = el('section', 'timeline-date-group');
      const dateSep = el('div', 'timeline-date');
      dateSep.textContent = new Date(entry.note.createdAt).toLocaleDateString(
        'pt-BR',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      );
      const dateRow = el('div', 'timeline-date-row');
      dateRow.appendChild(dateSep);
      group.appendChild(dateRow);
      container.appendChild(group);
    }

    const row = el('div', 'timeline-entry');
    const selected = previewNoteId === entry.note.id;
    const marked = selectedNoteIds.has(entry.note.id);
    const accent =
      colors.get(entry.chainId) ?? 'var(--md-sys-color-outline-variant)';
    row.setAttribute('role', 'article');
    row.tabIndex = 0;
    row.dataset['noteId'] = entry.note.id;
    row.classList.toggle('timeline-entry--selected', selected);
    row.classList.toggle('timeline-entry--marked', marked);
    row.classList.toggle('timeline-entry--selectable', selectionMode);
    row.setAttribute('aria-current', selected ? 'true' : 'false');
    row.setAttribute(
      'aria-label',
      selectionMode
        ? `Selecionar nota de ${formatDateFull(entry.note.createdAt)}`
        : `Abrir prévia da nota de ${formatDateFull(entry.note.createdAt)}`
    );
    row.style.setProperty('--timeline-chain-accent', accent);
    const openPreview = (): void => {
      appState.set({ timelinePreviewNoteId: entry.note.id });
    };
    const toggleSelection = (): void => {
      AppController.toggleTimelineNoteSelection(entry.note.id);
    };
    row.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      if (selectionMode) {
        if (target?.closest('a, button, input, label')) return;
        toggleSelection();
        return;
      }
      if (target?.closest('a, button')) return;
      openPreview();
    });
    row.addEventListener('keydown', (event) => {
      if (event.target !== row) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (selectionMode) toggleSelection();
      else openPreview();
    });

    const timeEl = el('time', 'timeline-entry__time');
    timeEl.setAttribute('datetime', entry.note.createdAt);
    timeEl.setAttribute('title', formatDateFull(entry.note.createdAt));
    timeEl.textContent = formatTime(entry.note.createdAt);

    const body = el('div', 'timeline-entry__body');
    const top = el('div', 'timeline-entry__top');
    const chainLink = el('button', 'timeline-entry__chain');
    chainLink.setAttribute('aria-label', `Abrir coleção: ${entry.chainTitle}`);
    const chainDot = el(
      'span',
      'timeline-chain-swatch timeline-entry__chain-dot'
    );
    chainDot.setAttribute('aria-hidden', 'true');
    chainDot.style.backgroundColor = accent;
    const chainLabel = el('span', 'timeline-entry__chain-name');
    chainLabel.textContent = entry.chainTitle;
    chainLink.append(chainDot, chainLabel);
    chainLink.addEventListener('click', (event) => {
      event.stopPropagation();
      void AppController.navigateTo('editor', entry.chainId);
    });

    const topChildren: HTMLElement[] = [];
    if (selectionMode) {
      const selectLabel = el('label', 'timeline-entry__select');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'timeline-entry__select-input';
      checkbox.checked = marked;
      checkbox.dataset['timelineSelect'] = entry.note.id;
      checkbox.setAttribute(
        'aria-label',
        `Selecionar nota de ${formatDateFull(entry.note.createdAt)}`
      );
      selectLabel.appendChild(checkbox);
      selectLabel.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener('change', () => {
        AppController.toggleTimelineNoteSelection(entry.note.id);
      });
      topChildren.push(selectLabel);
    }
    topChildren.push(chainLink, timeEl);
    top.append(...topChildren);

    const type = entry.note.contentType ?? 'text';
    const isCode = type === 'code';
    const isMarkdown = type === 'markdown';
    const textEl = el(
      isMarkdown ? 'div' : 'p',
      `timeline-entry__text${isCode ? ' timeline-entry__text--code' : ''}${
        isCode ? ' timeline-entry__text--verbatim' : ''
      }${isMarkdown ? ' timeline-entry__text--markdown note-markdown' : ''}`
    );
    if (isMarkdown) renderMarkdownContent(textEl, entry.note.content);
    else renderLinkedText(textEl, entry.note.content);
    highlightTextInElement(textEl, query);
    const content = el('div', 'timeline-entry__content');
    content.appendChild(textEl);

    const meta = el('div', 'timeline-entry__meta');
    const match = matchedField(entry.note, entry.chainTitle, query);
    if (match) {
      const matchBadge = el('span', 'timeline-entry__match');
      matchBadge.textContent = `Match em ${match}`;
      meta.appendChild(matchBadge);
    }
    if (type !== 'text') {
      const typeBadge = el('span', 'timeline-entry__type');
      typeBadge.textContent = contentTypeLabel(type);
      meta.appendChild(typeBadge);
    }

    if (entry.note.tags && entry.note.tags.length > 0) {
      const tags = el('div', 'timeline-entry__tags');
      const visibleTags = entry.note.tags.slice(0, TIMELINE_VISIBLE_TAGS);
      visibleTags.forEach((tag) => {
        const chip = el('span', 'chip chip--sm');
        chip.textContent = tag.name;
        tags.appendChild(chip);
      });
      const hiddenTags = entry.note.tags.slice(TIMELINE_VISIBLE_TAGS);
      if (hiddenTags.length > 0) {
        const more = el('span', 'chip chip--sm timeline-entry__tag-more');
        more.textContent = `+${hiddenTags.length}`;
        more.title = hiddenTags.map((tag) => tag.name).join(', ');
        more.setAttribute(
          'aria-label',
          `Mais ${hiddenTags.length} tags: ${hiddenTags
            .map((tag) => tag.name)
            .join(', ')}`
        );
        tags.appendChild(more);
      }
      meta.appendChild(tags);
    }

    const openIcon = el(
      'span',
      'material-symbols-rounded timeline-entry__open'
    );
    openIcon.setAttribute('aria-hidden', 'true');
    openIcon.textContent = 'chevron_right';
    meta.appendChild(openIcon);

    body.append(top, content, meta);
    row.appendChild(body);
    group?.appendChild(row);
  });
}
