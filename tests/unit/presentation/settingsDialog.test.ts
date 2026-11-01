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

  it('abre com as seções e a primeira aba ativa', () => {
    showSettingsDialog();

    const dialog = document.querySelector('#settings-dialog');
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];

    expect(dialog).not.toBeNull();
    expect(tabs).toHaveLength(3);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]?.textContent).toContain('Aparência');
    expect(tabs[1]?.textContent).toContain('Notas');
    expect(tabs[2]?.textContent).toContain('Comportamento');
    expect(
      document.querySelector('#settings-panel-appearance')?.getAttribute(
        'aria-labelledby'
      )
    ).toBe('settings-tab-appearance');
  });

  it('aplica e persiste a confirmação da lixeira na aba Comportamento', () => {
    showSettingsDialog();

    document.querySelector<HTMLButtonElement>('#settings-tab-behavior')?.click();

    const checkbox = document.querySelector<HTMLInputElement>(
      '#settings-confirm-trash'
    );
    if (!checkbox) throw new Error('Switch não encontrado');

    expect(checkbox.checked).toBe(true);
    expect(checkbox.getAttribute('role')).toBe('switch');
    expect(checkbox.getAttribute('aria-describedby')).toBe(
      'settings-confirm-trash-description'
    );
    expect(
      checkbox
        .closest('.settings-item')
        ?.querySelector('.settings-item__title')?.textContent
    ).toBe('Confirmar antes de excluir');

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getSettings().confirmBeforeTrash).toBe(false);
    expect(localStorage.getItem('threadnotes.settings')).toContain(
      '"confirmBeforeTrash":false'
    );
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Confirmar antes de excluir desativado.'
    );
  });
});
