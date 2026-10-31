import type { ChainSummaryDTO } from '@application/dto/index.js';
import { escapeHtml, formatDateCompact } from '@shared/utilities/index.js';
import { el } from '../dom.js';

export interface ChainListItemOptions {
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export function renderChainListItem(
  chain: ChainSummaryDTO,
  isActive: boolean,
  onOpen: () => void,
  options: ChainListItemOptions = {}
): HTMLElement {
  const item = el('div', `chain-item${isActive ? ' chain-item--active' : ''}`);
  const pinned = options.isPinned ?? false;
  const pinnedLabel = pinned ? ' (fixada)' : '';
  const noteLabel = `${chain.noteCount} nota${chain.noteCount !== 1 ? 's' : ''}`;

  item.dataset['chainId'] = chain.id;
  item.setAttribute('role', 'listitem');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `Cadeia: ${chain.displayTitle}${pinnedLabel}`);
  item.setAttribute('aria-current', isActive ? 'true' : 'false');
  item.title = chain.displayTitle;

  item.innerHTML = `
    <div class="chain-item__text">
      <span class="chain-item__title truncate">${escapeHtml(chain.displayTitle)}</span>
      <span class="chain-item__meta">${formatDateCompact(chain.updatedAt)} · ${noteLabel}</span>
    </div>
  `;

  if (options.onTogglePin) {
    const pin = el('button', 'chain-item__pin');
    pin.type = 'button';
    pin.setAttribute('aria-pressed', pinned ? 'true' : 'false');
    pin.setAttribute('aria-label', `${pinned ? 'Desafixar' : 'Fixar'} cadeia ${chain.displayTitle}`);
    pin.title = pinned ? 'Desafixar cadeia' : 'Fixar cadeia';
    pin.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">push_pin</span>';
    pin.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onTogglePin?.();
    });
    pin.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.stopPropagation();
      }
    });
    item.appendChild(pin);
  }

  item.addEventListener('click', onOpen);
  item.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen();
  });

  return item;
}
