import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showExampleScenarioDialog } from '@presentation/components/OnboardingDialog.js';

describe('OnboardingDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document
      .querySelector<HTMLButtonElement>('[id^="dialog-cancel-"]')
      ?.click();
    document.body.innerHTML = '';
  });

  it('oferece carregar exemplos ou começar em branco', async () => {
    const result = showExampleScenarioDialog();

    const dialog = document.querySelector('.dialog--confirm');
    expect(dialog?.querySelector('.dialog__title')?.textContent).toBe(
      'Bem-vindo ao Notes!'
    );
    expect(dialog?.querySelector('.dialog__body')?.textContent).toContain(
      'cenário de exemplo'
    );
    expect(dialog?.querySelector('.dialog__body')?.textContent).toContain(
      'começar em branco'
    );

    const cancel = dialog?.querySelector<HTMLButtonElement>(
      '[id^="dialog-cancel-"]'
    );
    expect(cancel?.textContent).toBe('Começar em branco');
    const confirm = dialog?.querySelector<HTMLButtonElement>(
      '[id^="dialog-confirm-"]'
    );
    expect(confirm?.textContent).toContain('Carregar exemplos');

    cancel?.click();
    await expect(result).resolves.toBe(false);
  });

  it('confirma o carregamento dos exemplos', async () => {
    const result = showExampleScenarioDialog();

    document
      .querySelector<HTMLButtonElement>('[id^="dialog-confirm-"]')
      ?.click();

    await expect(result).resolves.toBe(true);
  });
});
