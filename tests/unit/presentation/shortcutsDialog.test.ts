import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showShortcutsDialog } from '@presentation/components/ShortcutsDialog.js';

describe('ShortcutsDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#shortcuts-done')?.click();
    document.body.innerHTML = '';
  });

  it('lista os atalhos globais em um diálogo acessível', () => {
    showShortcutsDialog();

    const dialog = document.querySelector<HTMLElement>('#shortcuts-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.querySelector('#shortcuts-title')?.textContent).toBe('Atalhos de teclado');

    const items = [...document.querySelectorAll('.shortcuts-list__item')];
    expect(items).toHaveLength(6);
    expect(items[0]?.querySelector('.shortcut-key')?.textContent).toBe('N');
    expect(items[0]?.querySelector('.shortcuts-list__label')?.textContent).toBe(
      'Novo documento em branco'
    );
    expect(
      [...(items[1]?.querySelectorAll('.shortcut-key') ?? [])].map((key) => key.textContent)
    ).toEqual(['Shift', 'N']);
    expect(items[1]?.querySelector('.shortcuts-list__label')?.textContent).toBe('Nova coleção');
    expect(
      [...(items[4]?.querySelectorAll('.shortcut-key') ?? [])].map((key) => key.textContent)
    ).toEqual(['Ctrl', 'Enter']);
    expect(items[4]?.querySelector('.shortcuts-list__label')?.textContent).toBe(
      'Salvar nota e fechar o editor'
    );
    expect(document.querySelector('.shortcuts-dialog__hint')?.textContent).toContain('macOS');
  });

  it('fecha pelo botão e por Escape', () => {
    showShortcutsDialog();
    document.querySelector<HTMLButtonElement>('#shortcuts-close')?.click();
    expect(document.querySelector('#shortcuts-dialog')).toBeNull();

    showShortcutsDialog();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('#shortcuts-dialog')).toBeNull();
  });
});
