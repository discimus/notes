import { AppController } from '../pages/AppController.js';
import { mountDialog } from '../components/Dialog.js';
import { el, qs } from '../dom.js';
import { escapeHtml } from '@shared/utilities/index.js';

export function showChainMenu(e: MouseEvent, chainId: string): void {
  const existing = qs('#chain-menu');
  existing?.remove();

  const menu = el('div', 'chain-menu');
  menu.id = 'chain-menu';

  const btn = e.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();

  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const items: Array<{ icon: string; label: string; action: () => void; danger?: boolean }> = [
    {
      icon: 'archive',
      label: 'Arquivar',
      action: () => AppController.archiveChain(chainId),
    },
    {
      icon: 'delete',
      label: 'Mover para lixeira',
      action: () => AppController.deleteChain(chainId),
      danger: true,
    },
  ];

  items.forEach(({ icon, label, action, danger }) => {
    const item = el('button', `chain-menu__item${danger ? ' chain-menu__item--danger' : ''}`);
    item.innerHTML = `<span class="material-symbols-rounded icon-lg" aria-hidden="true">${escapeHtml(icon)}</span>${escapeHtml(label)}`;
    item.addEventListener('click', () => { menu.remove(); action(); });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 0);
}

export function showComposerModal(): void {
  const backdrop = el('div', 'dialog-backdrop');
  backdrop.setAttribute('role', 'presentation');

  const dialog = el('div', 'dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'modal-title');
  dialog.setAttribute('aria-describedby', 'modal-description modal-title-error');

  dialog.innerHTML = `
    <h2 id="modal-title" class="dialog__title dialog__title--left">Nova cadeia</h2>
    <p id="modal-description" class="dialog__body dialog__body--left">
      Você poderá adicionar notas depois.
    </p>
    <div class="text-field text-field--outlined form-field--spaced">
      <div class="text-field__container">
        <input type="text" class="text-field__input" id="modal-title-input"
          placeholder=" " autocomplete="off" aria-label="Título da cadeia"
          aria-required="true" data-autofocus />
        <label class="text-field__label" for="modal-title-input">Título *</label>
      </div>
    </div>
    <p class="text-field__supporting text-field__supporting--error" id="modal-title-error" role="alert" hidden>
      Informe um título para a cadeia.
    </p>
    <div class="dialog__actions">
      <button class="btn btn-text" id="modal-cancel">Cancelar</button>
      <button class="btn btn-filled" id="modal-save">
        <span class="material-symbols-rounded" aria-hidden="true">add</span> Criar cadeia
      </button>
    </div>
  `;

  const titleInput = dialog.querySelector<HTMLInputElement>('#modal-title-input')!;
  const error = dialog.querySelector<HTMLElement>('#modal-title-error')!;

  let destroy = (): void => {};
  const finish = (): void => destroy();

  const submit = async (): Promise<void> => {
    const title = titleInput.value.trim();
    if (!title) {
      error.hidden = false;
      titleInput.setAttribute('aria-invalid', 'true');
      titleInput.focus();
      return;
    }

    error.hidden = true;
    titleInput.removeAttribute('aria-invalid');
    finish();
    await AppController.createChain(title);
  };

  backdrop.appendChild(dialog);
  destroy = mountDialog(backdrop, dialog, finish);

  dialog.querySelector('#modal-cancel')!.addEventListener('click', finish);
  dialog.querySelector('#modal-save')!.addEventListener('click', () => {
    void submit();
  });
  titleInput.addEventListener('input', () => {
    if (error.hidden) return;
    error.hidden = true;
    titleInput.removeAttribute('aria-invalid');
  });
  titleInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void submit();
  });
}