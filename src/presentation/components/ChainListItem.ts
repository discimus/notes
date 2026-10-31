import type { ChainSummaryDTO } from '@application/dto/index.js';
import { escapeHtml, formatDateCompact } from '@shared/utilities/index.js';
import { el } from '../dom.js';

export function renderChainListItem(
  chain: ChainSummaryDTO,
  isActive: boolean,
  onOpen: () => void
): HTMLElement {
  const item = el('div', `chain-item${isActive ? ' chain-item--active' : ''}`);
  const favoriteLabel = chain.isFavorite ? ' (favorita)' : '';
  const noteLabel = `${chain.noteCount} nota${chain.noteCount !== 1 ? 's' : ''}`;

  item.dataset['chainId'] = chain.id;
  item.setAttribute('role', 'listitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `Cadeia: ${chain.displayTitle}${favoriteLabel}`);
  item.setAttribute('aria-current', isActive ? 'true' : 'false');
  item.title = chain.displayTitle;

  item.innerHTML = `
    <div class="chain-item__text">
      <span class="chain-item__title truncate">${escapeHtml(chain.displayTitle)}</span>
      <span class="chain-item__meta">${formatDateCompact(chain.updatedAt)} · ${noteLabel}</span>
    </div>
    ${chain.isFavorite ? '<span class="chain-item__favorite material-symbols-rounded" aria-hidden="true">star</span>' : ''}
  `;

  item.addEventListener('click', onOpen);
  item.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen();
  });

  return item;
}
