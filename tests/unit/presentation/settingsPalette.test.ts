import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';

describe('configuração de paleta de cores', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-palette');
    document.body.innerHTML = '';
    showSettingsDialog();
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
    localStorage.clear();
    document.documentElement.removeAttribute('data-palette');
  });

  it('mostra swatches e aplica a paleta imediatamente', () => {
    const violet = document.querySelector<HTMLInputElement>(
      '#settings-palette-violet'
    );
    const blue = document.querySelector<HTMLInputElement>(
      '#settings-palette-blue'
    );

    expect(document.querySelectorAll('.settings-palette__swatch')).toHaveLength(
      8
    );
    expect(violet?.checked).toBe(true);
    expect(blue).not.toBeNull();

    if (!blue) throw new Error('Paleta azul não encontrada');
    blue.checked = true;
    blue.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.documentElement.getAttribute('data-palette')).toBe('blue');
    expect(localStorage.getItem('threadnotes.palette')).toBe('blue');
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Paleta de cores: Azul.'
    );
  });
});
