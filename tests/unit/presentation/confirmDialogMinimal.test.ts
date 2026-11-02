import { afterEach, describe, expect, it } from 'vitest';
import { showConfirmDialog } from '@presentation/components/Dialog.js';

describe('Modal de confirmação minimalista', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('agrupa ícone e título em um cabeçalho compacto', async () => {
    const result = showConfirmDialog({
      title: 'Excluir nota?',
      body: 'Esta ação não pode ser desfeita.',
      icon: 'delete',
      destructive: true,
      confirmLabel: 'Excluir',
    });

    const dialog = document.querySelector('.dialog--confirm');
    const header = dialog?.querySelector('.dialog__confirm-header');
    expect(dialog).not.toBeNull();
    expect(header).not.toBeNull();
    expect(header?.querySelector('.dialog__icon')).not.toBeNull();
    expect(header?.querySelector('.dialog__title')?.textContent).toBe(
      'Excluir nota?'
    );
    expect(dialog?.querySelector('.dialog__body')?.textContent).toContain(
      'não pode ser desfeita'
    );
    expect(dialog?.querySelector('.btn--destructive')).not.toBeNull();

    dialog
      ?.querySelector<HTMLButtonElement>('[id^="dialog-cancel-"]')
      ?.click();
    await expect(result).resolves.toBe(false);
  });

  it('mantém o cabeçalho sem espaço de ícone quando não há ícone', async () => {
    const result = showConfirmDialog({ title: 'Continuar?' });
    const header = document.querySelector('.dialog__confirm-header');

    expect(header?.querySelector('.dialog__icon')).toBeNull();
    expect(header?.querySelector('.dialog__title')?.textContent).toBe(
      'Continuar?'
    );

    document
      .querySelector<HTMLButtonElement>('[id^="dialog-confirm-"]')
      ?.click();
    await expect(result).resolves.toBe(true);
  });
});
