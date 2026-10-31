import { beforeEach, describe, expect, it } from 'vitest';
import { showConfirmDialog } from '@presentation/components/Dialog.js';

describe('showConfirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('usa a variante destrutiva e resolve false ao cancelar', async () => {
    const result = showConfirmDialog({
      title: 'Excluir?',
      body: 'Ação sem volta.',
      destructive: true,
    });

    const backdrop = document.querySelector('.dialog-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop?.querySelector('.btn--destructive')).not.toBeNull();

    const cancel = backdrop?.querySelector<HTMLButtonElement>('[id^="dialog-cancel-"]');
    cancel?.click();

    await expect(result).resolves.toBe(false);
    expect(document.querySelector('.dialog-backdrop')).toBeNull();
  });
});
