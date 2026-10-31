import { escapeHtml } from '@shared/utilities/index.js';
import { el } from '../dom.js';

export function renderEmptyDetail(
  icon = 'notes',
  title = 'Selecione uma cadeia',
  body = 'Escolha uma cadeia na lista ou crie uma nova para começar.'
): HTMLElement {
  const empty = el('div', 'empty-state empty-state--fill');
  empty.setAttribute('aria-label', title);
  empty.innerHTML = `
    <div class="empty-state__icon" aria-hidden="true">
      <span class="material-symbols-rounded">${escapeHtml(icon)}</span>
    </div>
    <p class="empty-state__title">${escapeHtml(title)}</p>
    <p class="empty-state__body">${escapeHtml(body)}</p>
  `;
  return empty;
}

export function renderLoadingState(): HTMLElement {
  const loader = el('div', 'loading-state');
  loader.innerHTML = `
    <div class="linear-progress" role="progressbar" aria-label="Carregando…" aria-valuemin="0" aria-valuemax="100">
      <div class="linear-progress__track"></div>
    </div>
  `;
  return loader;
}
