import { appState } from '../state/AppState.js';
import type { AppState, TimelineFilters } from '../state/AppState.js';
import type { NoteContentType } from '@application/dto/index.js';
import { AppController } from '../pages/AppController.js';
import { el, qs } from '../dom.js';
import {
  formatDateCompact,
  formatDateFull,
  formatTime,
  normalizeText,
} from '@shared/utilities/index.js';
import type { ChainSummaryDTO, TagDTO, TimelineEntryDTO } from '@application/dto/index.js';
import { renderLinkedText } from '../components/LinkedText.js';
import { renderMarkdownContent } from '../components/MarkdownContent.js';
import { highlightTextInElement } from '../components/SearchHighlight.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';
import { renderNavToggle } from '../components/NavToggle.js';
import { getTimelineChainColors } from '../app/timelineColors.js';

let queryTimer: ReturnType<typeof setTimeout> | null = null;

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

  const layout = el('div', 'timeline-panel');
  layout.setAttribute('id', 'timeline-layout');

  const header = el('div', 'timeline-panel__header');
  header.setAttribute('role', 'search');
  header.innerHTML = `
    <div class="timeline-search-row">
      <div class="search-bar timeline-filter-search">
        <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
        <input type="search" class="search-bar__input" id="timeline-query"
          placeholder="Buscar notas..." aria-label="Buscar nas notas" autocomplete="off" />
      </div>
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
      <div class="timeline-filters">
        <section class="timeline-filter-section">
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

        <section class="timeline-filter-section">
          <h3 class="timeline-filter-section__title">Conteúdo</h3>
          <div class="timeline-chip-group" id="timeline-type-filter"
            aria-label="Filtrar por tipo de conteúdo"></div>
          <div class="timeline-inline-filter">
            <span class="timeline-filter-label">Tags</span>
            <div class="timeline-chip-group" id="timeline-tag-mode"
              aria-label="Combinação de tags"></div>
            <div class="timeline-tag-search">
              <input type="search" id="timeline-tag-search"
                aria-label="Buscar tags" placeholder="Buscar tag" autocomplete="off" />
            </div>
            <div class="timeline-tag-filter" id="timeline-tag-filter"
              aria-label="Filtrar por tags"></div>
          </div>
        </section>

        <section class="timeline-filter-section">
          <h3 class="timeline-filter-section__title">Cadeias</h3>
          <div class="timeline-chain-selector">
            <div class="timeline-chain-selector__toolbar">
              <div class="timeline-chain-search">
                <input type="search" id="timeline-chain-search"
                  aria-label="Buscar cadeias" placeholder="Buscar cadeia" autocomplete="off" />
              </div>
              <button class="chip timeline-chain-all" id="timeline-chain-all"
                type="button" aria-pressed="true">Todas</button>
            </div>
            <div class="chain-selector__list" id="timeline-chain-selector"
              aria-label="Cadeias para timeline"></div>
          </div>
        </section>

        <section class="timeline-filter-section">
          <h3 class="timeline-filter-section__title">Ordenação</h3>
          <div class="timeline-chip-group" id="timeline-sort"
            aria-label="Ordenar resultados"></div>
        </section>
      </div>
    </details>

    <div class="timeline-summary-row">
      <span class="timeline-result-count" id="timeline-result-count" aria-live="polite"></span>
      <div class="timeline-chain-legend" id="timeline-chain-legend"
        aria-label="Cadeias nos resultados"></div>
    </div>

    <div class="timeline-active-filters" id="timeline-active-filters"
      aria-label="Filtros ativos"></div>

    <div class="timeline-slider-row" hidden>
      <span class="timeline-slider-label" id="timeline-page-label">Todas as cadeias</span>
      <input type="range" id="timeline-slider" class="timeline-slider" min="0" max="0"
        step="1" value="0" aria-label="Navegar pelas páginas da timeline" disabled />
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

  header.prepend(renderNavToggle());
  layout.appendChild(header);

  const list = el('div', 'timeline-panel__list');
  list.setAttribute('id', 'timeline-list');
  list.setAttribute('aria-live', 'polite');
  layout.appendChild(list);

  const query = header.querySelector<HTMLInputElement>('#timeline-query')!;
  const from = header.querySelector<HTMLInputElement>('#timeline-from')!;
  const to = header.querySelector<HTMLInputElement>('#timeline-to')!;
  const clear = header.querySelector<HTMLButtonElement>('#timeline-clear-filters')!;
  const tagFilter = header.querySelector<HTMLElement>('#timeline-tag-filter')!;
  const tagSearch = header.querySelector<HTMLInputElement>('#timeline-tag-search')!;
  const filtersDetails = header.querySelector<HTMLDetailsElement>(
    '#timeline-filters-details'
  )!;
  const chainSelector = header.querySelector<HTMLElement>('#timeline-chain-selector')!;
  const chainSearch = header.querySelector<HTMLInputElement>('#timeline-chain-search')!;
  const chainAll = header.querySelector<HTMLButtonElement>('#timeline-chain-all')!;
  const slider = header.querySelector<HTMLInputElement>('#timeline-slider')!;
  const pageLabel = header.querySelector<HTMLElement>('#timeline-page-label')!;

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

  slider.addEventListener('input', () => {
    const stateNow = appState.get();
    const totalPages = Math.max(
      1,
      Math.ceil(stateNow.timelineTotal / stateNow.timelinePageSize)
    );
    pageLabel.textContent = `Página ${Number(slider.value) + 1} de ${totalPages}`;
  });
  slider.addEventListener('change', () => {
    void AppController.seekTimelinePage(Number(slider.value));
  });

  list.addEventListener('scroll', () => {
    if (list.scrollTop + list.clientHeight < list.scrollHeight - 120) return;
    void AppController.loadMoreTimeline();
  });

  renderTimelineFilters(header, state);
  renderChainSelector(chainSelector, state, '');
  updateTimelineEntries(list, state);
  updateTimelineSummary(header, state);
  updateTimelineSlider(slider, pageLabel, state);
  return layout;
}

export function updateTimelineLayout(content: HTMLElement, state: AppState): void {
  const header = qs('.timeline-panel__header', content);
  const list = qs('#timeline-list', content);
  if (!header || !list) return;

  renderTimelineFilters(header, state);
  const chainSelector = qs<HTMLElement>('#timeline-chain-selector', header);
  const chainSearch = qs<HTMLInputElement>('#timeline-chain-search', header);
  if (chainSelector) {
    renderChainSelector(chainSelector, state, chainSearch?.value ?? '');
  }
  updateTimelineEntries(list, state);
  updateTimelineSummary(header, state);
  updateTimelineSlider(
    qs<HTMLInputElement>('#timeline-slider', header)!,
    qs<HTMLElement>('#timeline-page-label', header)!,
    state
  );
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

function renderTagChips(
  header: HTMLElement,
  state: AppState,
  search: string
): void {
  const tagsHost = qs<HTMLElement>('#timeline-tag-filter', header);
  if (!tagsHost) return;

  const normalized = normalizeText(search);
  const tags = state.allTags.filter(
    (tag) => !normalized || normalizeText(tag.name).includes(normalized)
  );
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

  host.replaceChildren(...chips);
  host.hidden = chips.length === 0;

  const count = qs<HTMLElement>('#timeline-filter-count', header);
  if (count) {
    count.textContent = String(chips.length);
    count.hidden = chips.length === 0;
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
    empty.textContent = 'Nenhuma cadeia encontrada.';
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

function updateTimelineSummary(header: HTMLElement, state: AppState): void {
  const count = qs<HTMLElement>('#timeline-result-count', header);
  if (count) {
    const scope = state.timelineSelectedChainIds.length
      ? `${state.timelineSelectedChainIds.length} ${
          state.timelineSelectedChainIds.length === 1 ? 'cadeia' : 'cadeias'
        }`
      : 'todas as cadeias';
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

function updateTimelineSlider(
  slider: HTMLInputElement,
  label: HTMLElement,
  state: AppState
): void {
  const totalPages = Math.max(
    1,
    Math.ceil(state.timelineTotal / state.timelinePageSize)
  );
  const disabled = state.timelineTotal === 0 || totalPages <= 1;

  slider.max = String(Math.max(0, totalPages - 1));
  slider.value = String(state.timelinePageIndex);
  slider.disabled = disabled;
  const row = slider.closest<HTMLElement>('.timeline-slider-row');
  if (row) row.hidden = disabled;

  if (state.chainSummaries.length === 0) {
    label.textContent = 'Nenhuma cadeia cadastrada';
    return;
  }
  if (!state.timelineTotal) {
    label.textContent = 'Nenhuma nota encontrada';
    return;
  }

  const first = state.timelineEntries[0];
  const last = state.timelineEntries[state.timelineEntries.length - 1];
  const range =
    first && last
      ? ` • ${formatDateCompact(first.note.createdAt)} – ${formatDateCompact(
          last.note.createdAt
        )}`
      : '';

  label.textContent = `Página ${state.timelinePageIndex + 1} de ${totalPages}${range}`;
}

function updateTimelineEntries(container: HTMLElement, state: AppState): void {
  const previousScroll = container.scrollTop;
  const previousOffset = Number(
    container.dataset['loadedOffset'] ?? state.timelineLoadedOffset
  );
  const wasNearBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 120;

  container.innerHTML = '';
  container.dataset['loadedOffset'] = String(state.timelineLoadedOffset);

  if (state.isLoading && state.timelineEntries.length === 0) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (state.chainSummaries.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'timeline',
        'Nenhuma cadeia cadastrada',
        'Crie uma cadeia para começar a buscar nas notas.'
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
    state.timelineFilters.query
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

  if (state.timelineLoadedOffset > previousOffset && wasNearBottom) {
    container.scrollTop = container.scrollHeight;
  } else {
    container.scrollTop = previousScroll;
  }
}

function renderEntries(
  container: HTMLElement,
  entries: TimelineEntryDTO[],
  colors: Map<string, string>,
  query: string
): void {
  let lastDate = '';

  entries.forEach((entry) => {
    const dateStr = new Date(entry.note.createdAt).toLocaleDateString('pt-BR');
    if (dateStr !== lastDate) {
      lastDate = dateStr;
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
      container.appendChild(dateSep);
    }

    const row = el('div', 'timeline-entry timeline-entry--chain-color');
    row.setAttribute('role', 'article');
    row.style.setProperty(
      '--timeline-chain-accent',
      colors.get(entry.chainId) ?? 'var(--md-sys-color-outline-variant)'
    );

    const timeEl = el('time', 'timeline-entry__time');
    timeEl.setAttribute('datetime', entry.note.createdAt);
    timeEl.setAttribute('title', formatDateFull(entry.note.createdAt));
    timeEl.textContent = formatTime(entry.note.createdAt);

    const body = el('div', 'timeline-entry__body');
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

    const meta = el('div', 'timeline-entry__meta');
    const chainLink = el('button', 'timeline-entry__chain');
    chainLink.setAttribute('aria-label', `Abrir cadeia: ${entry.chainTitle}`);
    const chainDot = el('span', 'timeline-chain-swatch');
    chainDot.setAttribute('aria-hidden', 'true');
    chainDot.style.backgroundColor =
      colors.get(entry.chainId) ?? 'var(--md-sys-color-outline-variant)';
    const chainLabel = el('span');
    chainLabel.textContent = entry.chainTitle;
    chainLink.append(chainDot, chainLabel);
    chainLink.addEventListener('click', () => {
      void AppController.navigateTo('editor', entry.chainId);
    });
    meta.appendChild(chainLink);

    if (type !== 'text') {
      const typeBadge = el('span', 'timeline-entry__type');
      typeBadge.textContent = contentTypeLabel(type);
      meta.appendChild(typeBadge);
    }

    if (entry.note.tags && entry.note.tags.length > 0) {
      const tags = el('div', 'timeline-entry__tags');
      entry.note.tags.forEach((tag) => {
        const chip = el('span', 'chip chip--sm');
        chip.textContent = tag.name;
        tags.appendChild(chip);
      });
      meta.appendChild(tags);
    }

    body.appendChild(textEl);
    body.appendChild(meta);
    row.appendChild(timeEl);
    row.appendChild(body);
    container.appendChild(row);
  });
}
