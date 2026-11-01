import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { getNoteImageLayout } from '@presentation/app/noteImageLayout.js';
import { appState } from '@presentation/state/AppState.js';

describe('configuração de layout das imagens', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    appState.set({ noteImageLayout: 'thumbnails' });
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('exibe miniaturas como padrão e permite escolher largura da nota', () => {
    showSettingsDialog();
    document.querySelector<HTMLButtonElement>('#settings-tab-notes')?.click();

    const thumbnails = document.querySelector<HTMLInputElement>(
      '#settings-image-layout-thumbnails'
    );
    const column = document.querySelector<HTMLInputElement>(
      '#settings-image-layout-column'
    );

    expect(document.querySelector('#settings-notes-title')?.textContent).toBe(
      'Notas'
    );
    expect(thumbnails?.checked).toBe(true);
    expect(column?.checked).toBe(false);
    expect(
      column?.closest('.settings-radio')?.querySelector('.settings-radio__label')
        ?.textContent
    ).toBe('Largura da nota');

    column!.checked = true;
    column!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getNoteImageLayout()).toBe('column');
    expect(appState.get().noteImageLayout).toBe('column');
    expect(localStorage.getItem('threadnotes.notes.image-layout')).toBe('column');
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Layout das imagens: Largura da nota.'
    );

    thumbnails!.checked = true;
    thumbnails!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getNoteImageLayout()).toBe('thumbnails');
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Layout das imagens: Miniaturas.'
    );
  });
});
