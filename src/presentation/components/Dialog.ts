import { escapeHtml } from '../../shared/utilities/index.js';

interface DialogOptions {
  title: string;
  body?: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Dialog de confirmação MD3.
 * Retorna uma Promise<boolean> — true se confirmado.
 */
export function showConfirmDialog(options: DialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'dialog-title');
    if (options.body) dialog.setAttribute('aria-describedby', 'dialog-body');

    const parts: string[] = [];

    if (options.icon) {
      parts.push(`<div class="dialog__icon" aria-hidden="true"><span class="material-symbols-rounded">${escapeHtml(options.icon)}</span></div>`);
    }
    parts.push(`<h2 id="dialog-title" class="dialog__title">${escapeHtml(options.title)}</h2>`);
    if (options.body) {
      parts.push(`<p id="dialog-body" class="dialog__body">${escapeHtml(options.body)}</p>`);
    }
    parts.push(`
      <div class="dialog__actions">
        <button class="btn btn-text" id="dialog-cancel">${escapeHtml(options.cancelLabel ?? 'Cancelar')}</button>
        <button class="btn ${options.destructive ? 'btn-filled' : 'btn-filled'}" id="dialog-confirm" 
          style="${options.destructive ? `background-color: var(--md-sys-color-error); color: var(--md-sys-color-on-error)` : ''}">
          ${escapeHtml(options.confirmLabel ?? 'Confirmar')}
        </button>
      </div>
    `);

    dialog.innerHTML = parts.join('');

    const close = (result: boolean) => {
      backdrop.remove();
      resolve(result);
    };

    dialog.querySelector('#dialog-confirm')!.addEventListener('click', () => close(true));
    dialog.querySelector('#dialog-cancel')!.addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onKey); }
      if (e.key === 'Enter') { close(true); document.removeEventListener('keydown', onKey); }
    });

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Focus no botão de confirmação
    requestAnimationFrame(() => {
      (dialog.querySelector('#dialog-confirm') as HTMLElement)?.focus();
    });
  });
}

/**
 * Dialog de input simples.
 */
export function showInputDialog(options: {
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'input-dialog-title');

    dialog.innerHTML = `
      <h2 id="input-dialog-title" class="dialog__title">${escapeHtml(options.title)}</h2>
      <div class="text-field">
        <div class="text-field__container">
          <input
            type="text"
            class="text-field__input"
            id="input-dialog-field"
            placeholder=" "
            value="${escapeHtml(options.initialValue ?? '')}"
            aria-label="${escapeHtml(options.label)}"
            autocomplete="off"
          />
          <label class="text-field__label" for="input-dialog-field">${escapeHtml(options.label)}</label>
        </div>
      </div>
      <div class="dialog__actions">
        <button class="btn btn-text" id="input-cancel">Cancelar</button>
        <button class="btn btn-filled" id="input-confirm">${escapeHtml(options.confirmLabel ?? 'Confirmar')}</button>
      </div>
    `;

    const input = dialog.querySelector('#input-dialog-field') as HTMLInputElement;

    const close = (result: string | null) => {
      backdrop.remove();
      resolve(result);
    };

    dialog.querySelector('#input-confirm')!.addEventListener('click', () => {
      const val = input.value.trim();
      if (val) close(val);
    });
    dialog.querySelector('#input-cancel')!.addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) close(val);
      }
      if (e.key === 'Escape') close(null);
    });

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  });
}
