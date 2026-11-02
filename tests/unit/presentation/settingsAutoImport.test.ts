import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { getAutoImportFiles } from '@presentation/app/autoImportFiles.js';

describe('configuração de importação automática', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
  });

  it('expõe e persiste o switch de importação automática', () => {
    showSettingsDialog();

    document.querySelector<HTMLButtonElement>('#settings-tab-behavior')?.click();

    const checkbox = document.querySelector<HTMLInputElement>(
      '#settings-auto-import-files'
    );
    if (!checkbox) throw new Error('Switch não encontrado');

    expect(checkbox.checked).toBe(false);
    expect(checkbox.getAttribute('role')).toBe('switch');
    expect(checkbox.getAttribute('aria-describedby')).toBe(
      'settings-auto-import-files-description'
    );
    expect(
      checkbox
        .closest('.settings-item')
        ?.querySelector('.settings-item__title')?.textContent
    ).toBe('Importar arquivos automaticamente');

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getAutoImportFiles()).toBe(true);
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Importar arquivos automaticamente ativado.'
    );
  });
});
