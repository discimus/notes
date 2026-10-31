import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { getSettings } from '@presentation/app/settings.js';

describe('diálogo de configurações', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
  });

  it('mostra o checkbox à esquerda com label e descrição', () => {
    showSettingsDialog();

    const dialog = document.querySelector('#settings-dialog');
    const row = dialog?.querySelector('.settings-row');
    const checkbox = dialog?.querySelector<HTMLInputElement>('#settings-confirm-trash');

    expect(dialog).not.toBeNull();
    expect(row?.firstElementChild).toBe(checkbox);
    expect(checkbox?.checked).toBe(true);
    expect(checkbox?.getAttribute('aria-describedby')).toBe(
      'settings-confirm-trash-support'
    );
    expect(dialog?.querySelector('.settings-row__label')?.textContent).toBe(
      'Confirmar antes de excluir'
    );
    expect(dialog?.querySelector('.settings-row__support')?.textContent).toContain(
      'A exclusão permanente continua exigindo confirmação.'
    );
  });

  it('persiste a alteração imediatamente', () => {
    showSettingsDialog();

    const checkbox = document.querySelector<HTMLInputElement>('#settings-confirm-trash');
    if (!checkbox) throw new Error('Checkbox não encontrado');

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getSettings().confirmBeforeTrash).toBe(false);
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Confirmação desativada.'
    );
  });
});
