import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { snackbar } from '../components/Snackbar.js';
import { el, qs } from '../dom.js';
import { escapeHtml, formatDateFull, formatTime } from '@shared/utilities/index.js';
import type { ChainSummaryDTO } from '@application/dto/index.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';

export function renderTimelineLayout(state: AppState): HTMLElement {
  const layout = el('div', 'timeline-panel');
  layout.setAttribute('id', 'timeline-layout');

  const header = el('div', 'timeline-panel__header');

  const info = el('div', 'timeline-panel__info');
  info.innerHTML = `
    <span class="material-symbols-rounded" aria-hidden="true">info</span>
    <span>Visualização de leitura — não altera as cadeias originais</span>
  `;
  header.appendChild(info);

  const selectorSection = el('div', 'chain-selector');
  selectorSection.innerHTML = '<p class="chain-selector__label">Selecionar cadeias:</p>';

  const chainList = el('div', 'chain-selector__list');
  chainList.setAttribute('aria-label', 'Cadeias disponíveis para timeline');

  AppController.loadChains().then(() => {
    const chains = appState.get().chainSummaries;
    chains.forEach((chain) => {
      const item = renderChainSelectorItem(chain, state.timelineSelectedChainIds.includes(chain.id));
      chainList.appendChild(item);
    });
  });

  selectorSection.appendChild(chainList);

  const viewBtn = el('button', 'btn btn-filled');
  viewBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">timeline</span> Ver cronologia';
  viewBtn.addEventListener('click', () => {
    const selected = appState.get().timelineSelectedChainIds;
    if (selected.length < 2) {
      snackbar.show({ message: 'Selecione pelo menos 2 cadeias.' });
      return;
    }
    AppController.loadTimeline(selected);
  });
  selectorSection.appendChild(viewBtn);

  header.appendChild(selectorSection);
  layout.appendChild(header);

  const timelineList = el('div', 'timeline-panel__list');
  timelineList.setAttribute('id', 'timeline-list');
  timelineList.setAttribute('aria-live', 'polite');
  layout.appendChild(timelineList);

  renderTimelineEntries(timelineList, state);
  return layout;
}

function renderChainSelectorItem(chain: ChainSummaryDTO, isSelected: boolean): HTMLElement {
  const item = el('div', `chain-selector-item${isSelected ? ' chain-selector-item--selected' : ''}`);
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

  const toggle = () => {
    const current = appState.get().timelineSelectedChainIds;
    const newSelected = current.includes(chain.id)
      ? current.filter((id) => id !== chain.id)
      : [...current, chain.id];
    appState.set({ timelineSelectedChainIds: newSelected });
    item.classList.toggle('chain-selector-item--selected', newSelected.includes(chain.id));
    item.setAttribute('aria-checked', newSelected.includes(chain.id) ? 'true' : 'false');
    const check = item.querySelector('.chain-selector-item__check')!;
    check.innerHTML = newSelected.includes(chain.id)
      ? '<span class="material-symbols-rounded" aria-hidden="true">check</span>'
      : '';
  };

  item.addEventListener('click', toggle);
  item.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });

  return item;
}

export function updateTimelineLayout(content: HTMLElement, state: AppState): void {
  const list = qs('#timeline-list', content);
  if (list) renderTimelineEntries(list, state);
}

function renderTimelineEntries(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';

  if (state.isLoading) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (!state.timeline || state.timeline.entries.length === 0) {
    container.appendChild(renderEmptyDetail('timeline', 'Nenhuma entrada', 'Selecione cadeias acima e clique em "Ver cronologia".'));
    return;
  }

  let lastDate = '';
  state.timeline.entries.forEach((entry) => {
    const dateStr = new Date(entry.note.createdAt).toLocaleDateString('pt-BR');
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      const dateSep = el('div', 'timeline-date');
      dateSep.textContent = new Date(entry.note.createdAt).toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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
    const textEl = el('p', 'timeline-entry__text');
    textEl.textContent = entry.note.content;

    const chainLink = el('button', 'timeline-entry__chain');
    chainLink.setAttribute('aria-label', `Abrir cadeia: ${entry.chainTitle}`);
    chainLink.innerHTML = `
      <span class="material-symbols-rounded icon-xs" aria-hidden="true">open_in_new</span>
      ${escapeHtml(entry.chainTitle)}
    `;
    chainLink.addEventListener('click', () => AppController.navigateTo('chain-detail', entry.chainId));

    body.appendChild(textEl);
    body.appendChild(chainLink);
    row.appendChild(timeEl);
    row.appendChild(body);
    container.appendChild(row);
  });
}
