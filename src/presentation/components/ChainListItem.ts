import type { ChainSummaryDTO } from '@application/dto/index.js';
import { escapeHtml, formatDateCompact } from '@shared/utilities/index.js';
import { el } from '../dom.js';

export interface ChainListItemOptions {
  isPinned?: boolean;
  onTogglePin?: () => void;
  onOpenPinned?: () => void;
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
  item.setAttribute('aria-label', `Coleção: ${chain.displayTitle}${pinnedLabel}`);
  item.setAttribute('aria-current', isActive ? 'true' : 'false');
  item.title = options.onOpenPinned
    ? `${chain.displayTitle} — clique duas vezes para manter a aba aberta`
    : chain.displayTitle;
  if (options.onOpenPinned) {
    item.setAttribute(
      'aria-description',
      'Clique duas vezes ou pressione Ctrl+Enter para manter a aba aberta.'
    );
    item.setAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');
  }

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
    pin.setAttribute('aria-label', `${pinned ? 'Desafixar' : 'Fixar'} coleção ${chain.displayTitle}`);
    pin.title = pinned ? 'Desafixar coleção' : 'Fixar coleção';
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

  item.addEventListener('click', (event) => {
    if (event.detail >= 2 && options.onOpenPinned) {
      options.onOpenPinned();
      return;
    }
    onOpen();
  });
  item.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if ((event.ctrlKey || event.metaKey) && options.onOpenPinned) {
      options.onOpenPinned();
      return;
    }
    onOpen();
  });

  return item;
}
