import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showComposerModal } from '@presentation/views/menus.js';
import { AppController } from '@presentation/pages/AppController.js';

describe('Create chain dialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('solicita apenas o título e exige preenchimento', async () => {
    const create = vi.spyOn(AppController, 'createChain').mockResolvedValue(undefined);
    showComposerModal();

    const dialog = document.querySelector<HTMLElement>('.dialog')!;
    const title = dialog.querySelector<HTMLInputElement>('#modal-title-input')!;
    const save = dialog.querySelector<HTMLButtonElement>('#modal-save')!;

    expect(dialog.querySelector('#modal-content-input')).toBeNull();
    expect(dialog.querySelector('#modal-tags-row')).toBeNull();
    expect(title.getAttribute('aria-required')).toBe('true');

    save.click();
    expect(create).not.toHaveBeenCalled();
    expect(dialog.querySelector<HTMLElement>('#modal-title-error')?.hidden).toBe(false);
    expect(title.getAttribute('aria-invalid')).toBe('true');

    title.value = '  Meu projeto  ';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    save.click();

    await vi.waitFor(() => {
      expect(create).toHaveBeenCalledWith('Meu projeto');
    });
    expect(document.querySelector('.dialog')).toBeNull();
  });

  it('permite criar com Enter', async () => {
    const create = vi.spyOn(AppController, 'createChain').mockResolvedValue(undefined);
    showComposerModal();

    const title = document.querySelector<HTMLInputElement>('#modal-title-input')!;
    title.value = 'Projeto';
    title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    await vi.waitFor(() => {
      expect(create).toHaveBeenCalledWith('Projeto');
    });
  });
});
