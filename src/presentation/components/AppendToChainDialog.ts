import type { ChainSummaryDTO } from '@application/dto/index.js';
import { formatDateCompact } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';

export interface AppendToChainChoice {
  chainId: string;
  chainTitle: string;
}

export interface AppendToChainDialogOptions {
  chains: ChainSummaryDTO[];
}

let dialogSequence = 0;

export function showAppendToChainDialog(
  options: AppendToChainDialogOptions
): Promise<AppendToChainChoice | null> {
  return new Promise((resolve) => {
    const uid = ++dialogSequence;
    const titleId = `append-chain-title-${uid}`;
    const descriptionId = `append-chain-description-${uid}`;
    const searchId = `append-chain-search-${uid}`;
    const listId = `append-chain-list-${uid}`;
    const statusId = `append-chain-status-${uid}`;
    const radioName = `append-chain-choice-${uid}`;

    const backdrop = el('div', 'dialog-backdrop');
    backdrop.setAttribute('role', 'presentation');

    const dialog = el('div', 'dialog dialog--wide append-chain-dialog');
    dialog.id = `append-chain-dialog-${uid}`;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', descriptionId);

    dialog.innerHTML = `
      <div class="dialog__header">
        <div>
          <h2 id="${titleId}" class="dialog__title dialog__title--left">Adicionar à cadeia</h2>
          <p id="${descriptionId}" class="dialog__body dialog__body--left">
            Escolha a cadeia que receberá este documento como uma nova nota.
          </p>
        </div>
        <button class="btn-icon" id="append-chain-close-${uid}" type="button" aria-label="Fechar" title="Fechar">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="editor-field">
        <label class="editor-field__label" for="${searchId}">Cadeia</label>
        <input class="editor-field__input" id="${searchId}" type="search" autocomplete="off" placeholder="Buscar cadeia..." data-autofocus />
      </div>

      <div class="save-chain-list" id="${listId}" role="radiogroup" aria-label="Cadeias disponíveis"></div>
      <p class="editor-field__support" id="${statusId}" aria-live="polite"></p>

      <div class="dialog__actions">
        <button class="btn btn-text" id="append-chain-cancel-${uid}" type="button">Cancelar</button>
        <button class="btn btn-filled" id="append-chain-confirm-${uid}" type="button" disabled>Adicionar</button>
      </div>
    `;

    const search = dialog.querySelector<HTMLInputElement>(`#${searchId}`)!;
    const list = dialog.querySelector<HTMLElement>(`#${listId}`)!;
    const status = dialog.querySelector<HTMLParagraphElement>(`#${statusId}`)!;
    const confirm = dialog.querySelector<HTMLButtonElement>(`#append-chain-confirm-${uid}`)!;

    let selectedChainId: string | null = null;

    const selectedChain = (): ChainSummaryDTO | null =>
      options.chains.find((chain) => chain.id === selectedChainId) ?? null;

    const updateValidation = (): void => {
      confirm.disabled = selectedChainId === null;
      status.textContent =
        options.chains.length === 0
          ? 'Crie uma cadeia pela lateral para poder adicionar este documento.'
          : selectedChainId === null
            ? 'Selecione uma cadeia para continuar.'
            : '';
    };

    const renderList = (): void => {
      const query = search.value.trim().toLocaleLowerCase();
      const chains = options.chains.filter((chain) =>
        chain.displayTitle.toLocaleLowerCase().includes(query)
      );

      if (selectedChainId && !chains.some((chain) => chain.id === selectedChainId)) {
        selectedChainId = null;
      }

      list.innerHTML = '';

      if (chains.length === 0) {
        const empty = el('p', 'save-chain-list__empty');
        empty.textContent =
          options.chains.length === 0
            ? 'Nenhuma cadeia ativa disponível.'
            : 'Nenhuma cadeia encontrada.';
        list.appendChild(empty);
        updateValidation();
        return;
      }

      for (const chain of chains) {
        const label = el('label', 'save-chain-item');
        label.setAttribute('data-chain-id', chain.id);

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = radioName;
        input.value = chain.id;
        input.className = 'save-chain-item__input';
        input.checked = selectedChainId === chain.id;

        const content = el('span', 'save-chain-item__content');
        const title = el('span', 'save-chain-item__title');
        title.textContent = chain.displayTitle;
        const meta = el('span', 'save-chain-item__meta');
        meta.textContent = `${formatDateCompact(chain.updatedAt)} · ${chain.noteCount} ${
          chain.noteCount === 1 ? 'nota' : 'notas'
        }`;
        content.append(title, meta);

        label.append(input, content);
        label.classList.toggle('save-chain-item--selected', input.checked);

        input.addEventListener('change', () => {
          selectedChainId = chain.id;
          list.querySelectorAll<HTMLElement>('.save-chain-item').forEach((item) => {
            item.classList.toggle(
              'save-chain-item--selected',
              item.getAttribute('data-chain-id') === chain.id
            );
          });
          updateValidation();
        });

        list.appendChild(label);
      }

      updateValidation();
    };

    search.addEventListener('input', renderList);

    let destroy = (): void => {};
    let settled = false;

    const finish = (choice: AppendToChainChoice | null): void => {
      if (settled) return;
      settled = true;
      destroy();
      resolve(choice);
    };

    const submit = (): void => {
      const chain = selectedChain();
      if (!chain) return;
      finish({ chainId: chain.id, chainTitle: chain.displayTitle });
    };

    backdrop.appendChild(dialog);
    destroy = mountDialog(backdrop, dialog, () => finish(null));

    dialog
      .querySelector(`#append-chain-close-${uid}`)
      ?.addEventListener('click', () => finish(null));
    dialog
      .querySelector(`#append-chain-cancel-${uid}`)
      ?.addEventListener('click', () => finish(null));
    confirm.addEventListener('click', submit);

    search.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      submit();
    });

    renderList();
    updateValidation();
  });
}
