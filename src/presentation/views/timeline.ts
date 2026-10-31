import { appState } from '../state/AppState.js';
import type { AppState, TimelineFilters } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { el, qs } from '../dom.js';
import {
  escapeHtml,
  formatDateCompact,
  formatDateFull,
  formatTime,
} from '@shared/utilities/index.js';
import type { ChainSummaryDTO, TagDTO, TimelineEntryDTO } from '@application/dto/index.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';

let queryTimer: ReturnType<typeof setTimeout> | null = null;

export function renderTimelineLayout(state: AppState): HTMLElement {
  if (queryTimer) {
    clearTimeout(queryTimer);
    queryTimer = null;
  }

  const layout = el('div', 'timeline-panel');
  layout.setAttribute('id', 'timeline-layout');

  const header = el('div', 'timeline-panel__header');
  header.innerHTML = `
    <div class="timeline-filters">
      <div class="timeline-filters__row">
        <div class="text-field text-field--outlined timeline-filter-search">
          <div class="text-field__container">
            <input type="search" class="text-field__input" id="timeline-query"
              placeholder=" " aria-label="Buscar nas notas" autocomplete="off" />
            <label class="text-field__label" for="timeline-query">Buscar nas notas</label>
          </div>
        </div>
        <label class="timeline-filter-date">
          <span>De</span>
          <input type="date" id="timeline-from" aria-label="Data inicial" />
        </label>
        <label class="timeline-filter-date">
          <span>Até</span>
          <input type="date" id="timeline-to" aria-label="Data final" />
        </label>
        <button class="btn btn-text" id="timeline-clear-filters" type="button">Limpar filtros</button>
      </div>

      <div class="timeline-filters__row timeline-filters__row--tags">
        <span class="chain-selector__label">Tags:</span>
        <div class="timeline-tag-filter" id="timeline-tag-filter" aria-label="Filtrar por tags"></div>
      </div>

      <div class="timeline-chain-selector">
        <p class="chain-selector__label">Selecionar cadeias:</p>
        <div class="chain-selector__list" id="timeline-chain-selector" aria-label="Cadeias para timeline"></div>
      </div>

      <div class="timeline-slider-row">
        <span class="timeline-slider-label" id="timeline-page-label">Selecione cadeias para começar</span>
        <input type="range" id="timeline-slider" class="timeline-slider" min="0" max="0"
          step="1" value="0" aria-label="Navegar pelas páginas da timeline" disabled />
      </div>
    </div>
  `;
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
  const chainSelector = header.querySelector<HTMLElement>('#timeline-chain-selector')!;
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
    void AppController.clearTimelineFilters();
  });

  slider.addEventListener('input', () => {
    const stateNow = appState.get();
    const totalPages = Math.max(1, Math.ceil(stateNow.timelineTotal / stateNow.timelinePageSize));
    pageLabel.textContent = `Página ${Number(slider.value) + 1} de ${totalPages}`;
  });
  slider.addEventListener('change', () => {
    void AppController.seekTimelinePage(Number(slider.value));
  });

  list.addEventListener('scroll', () => {
    if (list.scrollTop + list.clientHeight < list.scrollHeight - 120) return;
    void AppController.loadMoreTimeline();
  });

  tagFilter.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tag-id]');
    if (!button) return;
    const tagId = button.dataset['tagId'];
    if (!tagId) return;
    const current = appState.get().timelineFilters.tagIds;
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    void AppController.updateTimelineFilters({ tagIds: next });
  });

  chainSelector.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-chain-id]');
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
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-chain-id]');
    if (!item) return;
    event.preventDefault();
    item.click();
  });

  renderTimelineFilters(header, state);
  renderChainSelector(chainSelector, state);
  updateTimelineEntries(list, state);
  updateTimelineSlider(slider, pageLabel, state);
  return layout;
}

export function updateTimelineLayout(content: HTMLElement, state: AppState): void {
  const header = qs('.timeline-panel__header', content);
  const list = qs('#timeline-list', content);
  if (!header || !list) return;

  renderTimelineFilters(header, state);
  const chainSelector = qs<HTMLElement>('#timeline-chain-selector', header);
  if (chainSelector) renderChainSelector(chainSelector, state);
  updateTimelineEntries(list, state);
  updateTimelineSlider(
    qs<HTMLInputElement>('#timeline-slider', header)!,
    qs<HTMLElement>('#timeline-page-label', header)!,
    state
  );
}

function renderTimelineFilters(header: HTMLElement, state: AppState): void {
  const query = qs<HTMLInputElement>('#timeline-query', header);
  const from = qs<HTMLInputElement>('#timeline-from', header);
  const to = qs<HTMLInputElement>('#timeline-to', header);
  const tagsHost = qs<HTMLElement>('#timeline-tag-filter', header);

  if (query && document.activeElement !== query && query.value !== state.timelineFilters.query) {
    query.value = state.timelineFilters.query;
  }
  if (from && document.activeElement !== from && from.value !== state.timelineFilters.from) {
    from.value = state.timelineFilters.from;
  }
  if (to && document.activeElement !== to && to.value !== state.timelineFilters.to) {
    to.value = state.timelineFilters.to;
  }

  if (tagsHost) {
    tagsHost.innerHTML = '';
    state.allTags.forEach((tag) => {
      tagsHost.appendChild(renderTagFilter(tag, state.timelineFilters));
    });
  }
}

function renderTagFilter(tag: TagDTO, filters: TimelineFilters): HTMLElement {
  const selected = filters.tagIds.includes(tag.id);
  const button = el('button', `chip timeline-tag-filter__chip${selected ? ' chip--selected' : ''}`);
  button.type = 'button';
  button.dataset['tagId'] = tag.id;
  button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  button.textContent = tag.name;
  return button;
}

function renderChainSelector(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';
  state.chainSummaries.forEach((chain) => {
    container.appendChild(
      renderChainSelectorItem(
        chain,
        state.timelineSelectedChainIds.includes(chain.id)
      )
    );
  });
}

function renderChainSelectorItem(chain: ChainSummaryDTO, isSelected: boolean): HTMLElement {
  const item = el(
    'div',
    `chain-selector-item${isSelected ? ' chain-selector-item--selected' : ''}`
  );
  item.setAttribute('tabindex', '0');
  item.setAttribute('role', 'checkbox');
  item.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  item.setAttribute('aria-label', chain.displayTitle);
  item.dataset['chainId'] = chain.id;

  item.innerHTML = `
    <div class="chain-selector-item__check">
      ${isSelected ? '<span class="material-symbols-rounded" aria-hidden="true">check</span>' : ''}
    </div>
    <span class="chain-selector-item__title">${escapeHtml(chain.displayTitle)}</span>
    <span class="chain-selector-item__count">${chain.noteCount} notas</span>
  `;

  return item;
}

function updateTimelineSlider(
  slider: HTMLInputElement,
  label: HTMLElement,
  state: AppState
): void {
  const totalPages = Math.max(1, Math.ceil(state.timelineTotal / state.timelinePageSize));
  const disabled = state.timelineTotal === 0 || totalPages <= 1;

  slider.max = String(Math.max(0, totalPages - 1));
  slider.value = String(state.timelinePageIndex);
  slider.disabled = disabled;

  if (!state.timelineSelectedChainIds.length) {
    label.textContent = 'Selecione cadeias para começar';
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
      ? ` · ${formatDateCompact(first.note.createdAt)} – ${formatDateCompact(last.note.createdAt)}`
      : '';

  label.textContent = `Página ${state.timelinePageIndex + 1} de ${totalPages}${range}`;
}

function updateTimelineEntries(container: HTMLElement, state: AppState): void {
  const previousScroll = container.scrollTop;
  const previousOffset = Number(container.dataset['loadedOffset'] ?? state.timelineLoadedOffset);
  const wasNearBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 120;

  container.innerHTML = '';
  container.dataset['loadedOffset'] = String(state.timelineLoadedOffset);

  if (state.isLoading && state.timelineEntries.length === 0) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (state.timelineSelectedChainIds.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'timeline',
        'Selecione cadeias',
        'Escolha pelo menos uma cadeia para montar a linha do tempo.'
      )
    );
    return;
  }

  if (state.timelineEntries.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'search_off',
        'Nenhuma nota encontrada',
        'Ajuste os filtros ou selecione outras cadeias.'
      )
    );
    return;
  }

  renderEntries(container, state.timelineEntries);

  if (state.timelineIsLoadingMore) {
    const loading = el('div', 'timeline-loading-more');
    loading.setAttribute('role', 'status');
    loading.textContent = 'Carregando mais…';
    container.appendChild(loading);
  } else if (
    state.timelineLoadedOffset + state.timelineEntries.length < state.timelineTotal
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

function renderEntries(container: HTMLElement, entries: TimelineEntryDTO[]): void {
  let lastDate = '';

  entries.forEach((entry) => {
    const dateStr = new Date(entry.note.createdAt).toLocaleDateString('pt-BR');
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      const dateSep = el('div', 'timeline-date');
      dateSep.textContent = new Date(entry.note.createdAt).toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      container.appendChild(dateSep);
    }

    const row = el('div', 'timeline-entry');
    row.setAttribute('role', 'article');

    const timeEl = el('time', 'timeline-entry__time');
    timeEl.setAttribute('datetime', entry.note.createdAt);
    timeEl.setAttribute('title', formatDateFull(entry.note.createdAt));
    timeEl.textContent = formatTime(entry.note.createdAt);

    const body = el('div', 'timeline-entry__body');
    const textEl = el(
      'p',
      `timeline-entry__text${entry.note.contentType === 'code' ? ' timeline-entry__text--code' : ''}`
    );
    textEl.textContent = entry.note.content;

    const chainLink = el('button', 'timeline-entry__chain');
    chainLink.setAttribute('aria-label', `Abrir cadeia: ${entry.chainTitle}`);
    chainLink.innerHTML = `
      <span class="material-symbols-rounded icon-xs" aria-hidden="true">open_in_new</span>
      ${escapeHtml(entry.chainTitle)}
    `;
    chainLink.addEventListener('click', () => {
      void AppController.navigateTo('editor', entry.chainId);
    });

    body.appendChild(textEl);
    body.appendChild(chainLink);
    row.appendChild(timeEl);
    row.appendChild(body);
    container.appendChild(row);
  });
}
