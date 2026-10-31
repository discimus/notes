import { escapeHtml } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { mountDialog } from './Dialog.js';

export type CloseTabChoice = 'save' | 'discard' | 'cancel';

let dialogSequence = 0;

export function showCloseTabDialog(tabTitle: string): Promise<CloseTabChoice> {
  return new Promise((resolve) => {
    const uid = ++dialogSequence;
    const titleId = `close-tab-title-${uid}`;
    const bodyId = `close-tab-body-${uid}`;

    const backdrop = el('div', 'dialog-backdrop');
    backdrop.setAttribute('role', 'presentation');

    const dialog = el('div', 'dialog');
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', bodyId);

    dialog.innerHTML = `
      <div class="dialog__icon" aria-hidden="true">
        <span class="material-symbols-rounded">edit_note</span>
      </div>
      <h2 id="${titleId}" class="dialog__title">Salvar alterações?</h2>
      <p id="${bodyId}" class="dialog__body">
        O documento “${escapeHtml(tabTitle)}” tem alterações não salvas.
      </p>
      <div class="dialog__actions dialog__actions--stacked">
        <button class="btn btn-text" id="close-tab-cancel-${uid}" type="button">Cancelar</button>
        <button class="btn btn-text" id="close-tab-discard-${uid}" type="button">Descartar</button>
        <button class="btn btn-filled" id="close-tab-save-${uid}" type="button" data-autofocus>Salvar</button>
      </div>
    `;

    backdrop.appendChild(dialog);

    let destroy = (): void => {};
    let settled = false;

    const finish = (choice: CloseTabChoice): void => {
      if (settled) return;
      settled = true;
      destroy();
      resolve(choice);
    };

    destroy = mountDialog(backdrop, dialog, () => finish('cancel'));

    dialog
      .querySelector(`#close-tab-cancel-${uid}`)
      ?.addEventListener('click', () => finish('cancel'));
    dialog
      .querySelector(`#close-tab-discard-${uid}`)
      ?.addEventListener('click', () => finish('discard'));
    dialog
      .querySelector(`#close-tab-save-${uid}`)
      ?.addEventListener('click', () => finish('save'));
  });
}
