import { AppController } from '../pages/AppController.js';
import { mountDialog } from '../components/Dialog.js';
import { el, qs } from '../dom.js';
import { escapeHtml } from '@shared/utilities/index.js';

export interface ChainMenuOptions {
  onRename?: () => void;
  selectedNoteCount?: number;
  onMoveSelected?: () => void;
  onDeleteSelected?: () => void;
}

interface ChainMenuItem {
  icon: string;
  label: string;
  action?: (() => void) | undefined;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function showChainMenu(
  e: MouseEvent,
  chainId: string,
  options: ChainMenuOptions = {}
): void {
  const existing = qs('#chain-menu');
  existing?.remove();

  const menu = el('div', 'chain-menu');
  menu.id = 'chain-menu';
  menu.setAttribute('role', 'menu');

  const btn = e.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();

  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const items: ChainMenuItem[] = [];
  const selectedNoteCount = options.selectedNoteCount ?? 0;
  menu.setAttribute(
    'aria-label',
    selectedNoteCount > 0
      ? 'Ações das notas selecionadas'
      : 'Ações da coleção'
  );

  if (selectedNoteCount > 0) {
    items.push(
      {
        icon: 'drive_file_move',
        label: 'Mover selecionadas',
        action: options.onMoveSelected,
      },
      {
        icon: 'delete',
        label: 'Excluir selecionadas',
        action: options.onDeleteSelected,
        danger: true,
      }
    );
  } else {
    if (options.onRename) {
      items.push({
        icon: 'edit',
        label: 'Renomear',
        action: options.onRename,
      });
    }

    items.push(
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
      }
    );
  }

  const close = (): void => {
    menu.remove();
  };

  const menuItems: HTMLButtonElement[] = [];
  items.forEach(({ icon, label, action, danger, disabled, hint }) => {
    const item = el(
      'button',
      `chain-menu__item${danger ? ' chain-menu__item--danger' : ''}`
    );
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.disabled = disabled === true;
    if (disabled) item.setAttribute('aria-disabled', 'true');
    if (hint) item.title = hint;
    item.innerHTML = `<span class="material-symbols-rounded icon-lg" aria-hidden="true">${escapeHtml(icon)}</span>${escapeHtml(label)}`;
    item.addEventListener('click', () => {
      if (item.disabled) return;
      close();
      action?.();
    });
    menu.appendChild(item);
    if (!disabled) menuItems.push(item);
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      btn.focus();
      return;
    }
    if (menuItems.length === 0) return;
    const index = menuItems.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const next =
        index < 0
          ? 0
          : (index + direction + menuItems.length) % menuItems.length;
      menuItems[next]?.focus();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      menuItems[event.key === 'Home' ? 0 : menuItems.length - 1]?.focus();
    }
  });

  document.body.appendChild(menu);
  menuItems[0]?.focus();

  setTimeout(() => {
    document.addEventListener('click', close, { once: true });
  }, 0);
}

export interface NoteMenuOptions {
  onMove: () => void;
  onDelete: () => void;
}

export function showNoteMenu(e: MouseEvent, options: NoteMenuOptions): void {
  const existing = qs('#note-menu');
  existing?.remove();

  const menu = el('div', 'chain-menu');
  menu.id = 'note-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Ações da nota');

  const btn = e.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const items: ChainMenuItem[] = [
    {
      icon: 'drive_file_move',
      label: 'Mover para outra coleção',
      action: options.onMove,
    },
    {
      icon: 'delete',
      label: 'Excluir nota',
      action: options.onDelete,
      danger: true,
    },
  ];

  const close = (): void => menu.remove();
  const buttons: HTMLButtonElement[] = [];

  for (const { icon, label, action, danger } of items) {
    const button = el(
      'button',
      `chain-menu__item${danger ? ' chain-menu__item--danger' : ''}`
    );
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.innerHTML = `<span class="material-symbols-rounded icon-lg" aria-hidden="true">${escapeHtml(icon)}</span>${escapeHtml(label)}`;
    button.addEventListener('click', () => {
      close();
      action?.();
    });
    menu.appendChild(button);
    buttons.push(button);
  }

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      btn.focus();
      return;
    }
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const next =
        index < 0 ? 0 : (index + direction + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  });

  document.body.appendChild(menu);
  buttons[0]?.focus();

  setTimeout(() => {
    document.addEventListener('click', close, { once: true });
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
    <h2 id="modal-title" class="dialog__title dialog__title--left">Nova coleção</h2>
    <p id="modal-description" class="dialog__body dialog__body--left">
      Você poderá adicionar notas depois.
    </p>
    <div class="text-field text-field--outlined form-field--spaced">
      <div class="text-field__container">
        <input type="text" class="text-field__input" id="modal-title-input"
          placeholder=" " autocomplete="off" aria-label="Título da coleção"
          aria-required="true" data-autofocus />
        <label class="text-field__label" for="modal-title-input">Título *</label>
      </div>
    </div>
    <p class="text-field__supporting text-field__supporting--error" id="modal-title-error" role="alert" hidden>
      Informe um título para a coleção.
    </p>
    <div class="dialog__actions">
      <button class="btn btn-text" id="modal-cancel">Cancelar</button>
      <button class="btn btn-filled" id="modal-save">
        <span class="material-symbols-rounded" aria-hidden="true">add</span> Criar coleção
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