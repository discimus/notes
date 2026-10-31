import { escapeHtml } from '@shared/utilities/index.js';

interface DialogOptions {
  title: string;
  body?: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface DialogEntry {
  dialog: HTMLElement;
  close: () => void;
}

const dialogStack: DialogEntry[] = [];
let dialogId = 0;
let globalEscapeBound = false;

function scheduleFocus(callback: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
}

function getFocusable(dialog: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return [...dialog.querySelectorAll<HTMLElement>(selector)].filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true'
  );
}

function trapFocus(dialog: HTMLElement, event: KeyboardEvent): void {
  const focusable = getFocusable(dialog);
  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = document.activeElement;
  const inside = active instanceof HTMLElement && dialog.contains(active);

  if (event.shiftKey) {
    if (!inside || active === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (!inside || active === last) {
    event.preventDefault();
    first.focus();
  }
}

function ensureGlobalEscape(): void {
  if (globalEscapeBound) return;
  globalEscapeBound = true;

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const top = dialogStack[dialogStack.length - 1];
    if (!top) return;
    event.preventDefault();
    top.close();
  });
}

/**
 * Monta um diálogo já construído no DOM, cuidando de foco, Escape e pilha.
 * Retorna a função de destruição para ser usada pelos botões internos.
 */
export function mountDialog(
  backdrop: HTMLElement,
  dialog: HTMLElement,
  onExternalClose: () => void
): () => void {
  const restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let destroyed = false;

  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    backdrop.remove();
    const index = dialogStack.findIndex((entry) => entry.dialog === dialog);
    if (index >= 0) dialogStack.splice(index, 1);
    if (restoreFocus?.isConnected) restoreFocus.focus();
  };

  const close = () => {
    destroy();
    onExternalClose();
  };

  dialogStack.push({ dialog, close });
  ensureGlobalEscape();

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') trapFocus(dialog, event);
  });

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });

  document.body.appendChild(backdrop);

  scheduleFocus(() => {
    const preferred = dialog.querySelector<HTMLElement>('[data-autofocus]');
    const target = preferred ?? getFocusable(dialog)[0] ?? dialog;
    target.focus();
    if (target instanceof HTMLInputElement) target.select();
  });

  return destroy;
}

export function showConfirmDialog(options: DialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const uid = ++dialogId;
    const titleId = `dialog-title-${uid}`;
    const bodyId = `dialog-body-${uid}`;

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    if (options.body) dialog.setAttribute('aria-describedby', bodyId);

    const parts: string[] = [];

    if (options.icon) {
      parts.push(
        `<div class="dialog__icon" aria-hidden="true"><span class="material-symbols-rounded">${escapeHtml(options.icon)}</span></div>`
      );
    }
    parts.push(`<h2 id="${titleId}" class="dialog__title">${escapeHtml(options.title)}</h2>`);
    if (options.body) {
      parts.push(`<p id="${bodyId}" class="dialog__body">${escapeHtml(options.body)}</p>`);
    }
    parts.push(`
      <div class="dialog__actions">
        <button class="btn btn-text" id="dialog-cancel-${uid}" type="button">${escapeHtml(options.cancelLabel ?? 'Cancelar')}</button>
        <button class="btn btn-filled${options.destructive ? ' btn--destructive' : ''}" id="dialog-confirm-${uid}" type="button" data-autofocus>
          ${escapeHtml(options.confirmLabel ?? 'Confirmar')}
        </button>
      </div>
    `);

    dialog.innerHTML = parts.join('');
    backdrop.appendChild(dialog);

    let destroy = () => {};
    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      destroy();
      resolve(result);
    };

    destroy = mountDialog(backdrop, dialog, () => finish(false));

    dialog.querySelector(`#dialog-confirm-${uid}`)!.addEventListener('click', () => finish(true));
    dialog.querySelector(`#dialog-cancel-${uid}`)!.addEventListener('click', () => finish(false));
  });
}

export function showInputDialog(options: {
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const uid = ++dialogId;
    const titleId = `input-dialog-title-${uid}`;
    const fieldId = `input-dialog-field-${uid}`;

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);

    dialog.innerHTML = `
      <h2 id="${titleId}" class="dialog__title">${escapeHtml(options.title)}</h2>
      <div class="text-field">
        <div class="text-field__container">
          <input
            type="text"
            class="text-field__input"
            id="${fieldId}"
            placeholder=" "
            value="${escapeHtml(options.initialValue ?? '')}"
            aria-label="${escapeHtml(options.label)}"
            autocomplete="off"
            data-autofocus
          />
          <label class="text-field__label" for="${fieldId}">${escapeHtml(options.label)}</label>
        </div>
      </div>
      <div class="dialog__actions">
        <button class="btn btn-text" id="input-cancel-${uid}" type="button">Cancelar</button>
        <button class="btn btn-filled" id="input-confirm-${uid}" type="button">${escapeHtml(options.confirmLabel ?? 'Confirmar')}</button>
      </div>
    `;

    const input = dialog.querySelector<HTMLInputElement>(`#${fieldId}`)!;
    backdrop.appendChild(dialog);

    let destroy = () => {};
    let settled = false;
    const finish = (result: string | null) => {
      if (settled) return;
      settled = true;
      destroy();
      resolve(result);
    };

    destroy = mountDialog(backdrop, dialog, () => finish(null));

    dialog.querySelector(`#input-confirm-${uid}`)!.addEventListener('click', () => {
      const value = input.value.trim();
      if (value) finish(value);
    });
    dialog.querySelector(`#input-cancel-${uid}`)!.addEventListener('click', () => finish(null));

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const value = input.value.trim();
        if (value) finish(value);
      }
    });
  });
}
