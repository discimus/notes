import { el } from '../dom.js';

export interface ChainsBulkAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

export interface ChainsBulkControlsOptions {
  idPrefix: string;
  mode: boolean;
  selectedIds: string[];
  visibleChainIds: string[];
  onEnter: () => void;
  onExit: () => void;
  onToggleAll: (visibleChainIds: string[]) => void;
  actions: ChainsBulkAction[];
}

export function renderChainsBulkControls(
  options: ChainsBulkControlsOptions
): HTMLElement {
  const host = el('div', 'chains-bulk-controls');

  if (!options.mode) {
    const toggle = el('button', 'btn-icon chains-bulk-controls__toggle');
    toggle.type = 'button';
    toggle.id = `${options.idPrefix}-bulk-toggle`;
    toggle.setAttribute('aria-label', 'Selecionar coleções');
    toggle.title = 'Selecionar coleções';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">checklist</span>';
    toggle.addEventListener('click', options.onEnter);
    host.appendChild(toggle);
    return host;
  }

  const selected = new Set(options.selectedIds);
  const visibleSelected = options.visibleChainIds.filter((id) =>
    selected.has(id)
  ).length;

  const allLabel = el('label', 'chains-bulk-controls__all');
  const all = document.createElement('input');
  all.type = 'checkbox';
  all.id = `${options.idPrefix}-bulk-all`;
  all.disabled = options.visibleChainIds.length === 0;
  all.checked =
    options.visibleChainIds.length > 0 &&
    visibleSelected === options.visibleChainIds.length;
  all.indeterminate =
    visibleSelected > 0 && visibleSelected < options.visibleChainIds.length;
  all.setAttribute('aria-label', 'Selecionar todas as coleções');
  const allText = el('span');
  allText.textContent = 'Todas';
  allLabel.append(all, allText);
  all.addEventListener('change', () =>
    options.onToggleAll(options.visibleChainIds)
  );
  host.appendChild(allLabel);

  const countText =
    options.selectedIds.length === 1
      ? '1 selecionada'
      : `${options.selectedIds.length} selecionadas`;
  const count = el('span', 'chains-bulk-controls__count');
  count.textContent = countText;
  host.appendChild(count);

  options.actions.forEach((action) => {
    const button = el('button', 'btn-icon chains-bulk-controls__action');
    button.type = 'button';
    button.id = `${options.idPrefix}-bulk-${action.id}`;
    button.disabled = options.selectedIds.length === 0;
    button.setAttribute('aria-label', action.label);
    button.title = action.label;
    button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${action.icon}</span>`;
    button.addEventListener('click', action.onClick);
    host.appendChild(button);
  });

  const cancel = el('button', 'btn-icon');
  cancel.type = 'button';
  cancel.id = `${options.idPrefix}-bulk-cancel`;
  cancel.setAttribute('aria-label', 'Cancelar seleção de coleções');
  cancel.title = 'Cancelar seleção de coleções';
  cancel.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">close</span>';
  cancel.addEventListener('click', options.onExit);
  host.appendChild(cancel);

  return host;
}
