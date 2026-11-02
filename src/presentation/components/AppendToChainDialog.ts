import type { ChainSummaryDTO } from '@application/dto/index.js';
import { escapeHtml, formatDateCompact, normalizeText } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';

export interface ExistingAppendToChainChoice {
  chainId: string;
  chainTitle: string;
  createTitle?: undefined;
}

export interface NewAppendToChainChoice {
  chainId: null;
  chainTitle: string;
  createTitle: string;
}

export type AppendToChainChoice =
  | ExistingAppendToChainChoice
  | NewAppendToChainChoice;

export interface AppendToChainDialogOptions {
  chains: ChainSummaryDTO[];
  title?: string;
  description?: string;
  confirmLabel?: string;
  allowCreate?: boolean;
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
    const createSlotId = `append-chain-create-${uid}`;
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
          <h2 id="${titleId}" class="dialog__title dialog__title--left">${escapeHtml(
            options.title ?? 'Adicionar à coleção'
          )}</h2>
          <p id="${descriptionId}" class="dialog__body dialog__body--left">
            ${escapeHtml(
              options.description ??
                'Escolha uma coleção existente ou crie uma nova com o título digitado.'
            )}
          </p>
        </div>
        <button class="btn-icon" id="append-chain-close-${uid}" type="button" aria-label="Fechar" title="Fechar">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="editor-field">
        <label class="editor-field__label" for="${searchId}">Coleção</label>
        <input class="editor-field__input" id="${searchId}" type="search" autocomplete="off"
          placeholder="Buscar ou criar coleção..." data-autofocus />
      </div>

      <div id="${createSlotId}"></div>
      <div class="save-chain-list" id="${listId}" role="radiogroup" aria-label="Coleções disponíveis"></div>
      <p class="editor-field__support" id="${statusId}" aria-live="polite"></p>

      <div class="dialog__actions">
        <button class="btn btn-text" id="append-chain-cancel-${uid}" type="button">Cancelar</button>
        <button class="btn btn-filled" id="append-chain-confirm-${uid}" type="button" disabled>${escapeHtml(
          options.confirmLabel ?? 'Adicionar'
        )}</button>
      </div>
    `;

    const search = dialog.querySelector<HTMLInputElement>(`#${searchId}`)!;
    const createSlot = dialog.querySelector<HTMLElement>(`#${createSlotId}`)!;
    const list = dialog.querySelector<HTMLElement>(`#${listId}`)!;
    const status = dialog.querySelector<HTMLParagraphElement>(`#${statusId}`)!;
    const confirm = dialog.querySelector<HTMLButtonElement>(`#append-chain-confirm-${uid}`)!;

    let selectedChainId: string | null = null;
    let creatableTitle: string | null = null;

    const selectedChain = (): ChainSummaryDTO | null =>
      options.chains.find((chain) => chain.id === selectedChainId) ?? null;

    const exactChain = (): ChainSummaryDTO | null => {
      const query = normalizeText(search.value);
      if (!query) return null;
      return (
        options.chains.find((chain) => normalizeText(chain.displayTitle) === query) ??
        null
      );
    };

    const chooseExisting = (chain: ChainSummaryDTO): void => {
      finish({ chainId: chain.id, chainTitle: chain.displayTitle });
    };

    const chooseNew = (title: string): void => {
      finish({ chainId: null, chainTitle: title, createTitle: title });
    };

    const updateValidation = (): void => {
      const exact = exactChain();
      confirm.disabled = selectedChainId === null && exact === null;

      if (selectedChainId !== null || exact) {
        status.textContent = '';
      } else if (creatableTitle) {
        status.textContent = 'Pressione Enter para criar esta coleção.';
      } else if (options.chains.length === 0) {
        status.textContent =
          'Crie uma coleção pela lateral ou digite um título para criá-la aqui.';
      } else {
        status.textContent = 'Selecione uma coleção para continuar.';
      }
    };

    const renderCreateAction = (): void => {
      createSlot.innerHTML = '';
      if (options.allowCreate === false || !creatableTitle) return;

      const title = creatableTitle;
      const button = el('button', 'save-chain-create');
      button.type = 'button';
      button.setAttribute('aria-label', `Criar coleção ${title}`);
      button.innerHTML = `
        <span class="save-chain-create__icon material-symbols-rounded" aria-hidden="true">add</span>
        <span class="save-chain-create__content">
          <span class="save-chain-create__title">Criar coleção</span>
          <span class="save-chain-create__meta">“${escapeHtml(title)}”</span>
        </span>
        <span class="save-chain-create__arrow material-symbols-rounded" aria-hidden="true">arrow_forward</span>
      `;
      button.addEventListener('click', () => chooseNew(title));
      createSlot.appendChild(button);
    };

    const renderList = (): void => {
      const query = normalizeText(search.value);
      const chains = options.chains.filter((chain) =>
        normalizeText(chain.displayTitle).includes(query)
      );
      const exact = query
        ? options.chains.find((chain) => normalizeText(chain.displayTitle) === query)
        : undefined;
      creatableTitle =
        options.allowCreate === false
          ? null
          : search.value.trim() && !exact
            ? search.value.trim()
            : null;

      if (selectedChainId && !chains.some((chain) => chain.id === selectedChainId)) {
        selectedChainId = null;
      }

      renderCreateAction();
      list.innerHTML = '';

      if (chains.length === 0) {
        const empty = el('p', 'save-chain-list__empty');
        empty.textContent =
          options.chains.length === 0
            ? 'Nenhuma coleção ativa disponível.'
            : 'Nenhuma coleção encontrada.';
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
        const chainTitle = el('span', 'save-chain-item__title');
        chainTitle.textContent = chain.displayTitle;
        const meta = el('span', 'save-chain-item__meta');
        meta.textContent = `${formatDateCompact(chain.updatedAt)} · ${chain.noteCount} ${
          chain.noteCount === 1 ? 'nota' : 'notas'
        }`;
        content.append(chainTitle, meta);

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
      const chain = selectedChain() ?? exactChain();
      if (chain) {
        chooseExisting(chain);
        return;
      }
      if (creatableTitle) chooseNew(creatableTitle);
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
