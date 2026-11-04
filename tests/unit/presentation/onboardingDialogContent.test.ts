import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showExampleScenarioDialog } from '@presentation/components/OnboardingDialog.js';

describe('OnboardingDialog — primeiro contato', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document
      .querySelector<HTMLButtonElement>('[id^="dialog-cancel-"]')
      ?.click();
    document.body.innerHTML = '';
  });

  it('explica armazenamento local e o guia de importação no primeiro contato', () => {
    void showExampleScenarioDialog();

    const body = document.querySelector('.dialog__body')?.textContent ?? '';
    expect(body).toContain('localmente no navegador');
    expect(body).toContain('sem conta');
    expect(body).toContain('guia de importação de arquivos e pastas');
  });
});
