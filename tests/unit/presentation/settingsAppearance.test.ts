import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { appState } from '@presentation/state/AppState.js';

describe('configurações de aparência', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    appState.set({ theme: 'system', compactMode: false });
    showSettingsDialog();
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
    localStorage.clear();
    appState.set({ theme: 'system', compactMode: false });
  });

  it('aplica tema e modo compacto imediatamente', () => {
    const dark = document.querySelector<HTMLInputElement>('#settings-theme-dark');
    if (!dark) throw new Error('Radio de tema não encontrado');

    dark.checked = true;
    dark.dispatchEvent(new Event('change', { bubbles: true }));

    expect(appState.get().theme).toBe('dark');
    expect(localStorage.getItem('threadnotes.theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Tema: Escuro.'
    );

    const compact = document.querySelector<HTMLInputElement>(
      '#settings-compact-mode'
    );
    if (!compact) throw new Error('Switch de modo compacto não encontrado');

    compact.checked = true;
    compact.dispatchEvent(new Event('change', { bubbles: true }));

    expect(appState.get().compactMode).toBe(true);
    expect(localStorage.getItem('threadnotes.compact-mode')).toBe('true');
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Modo compacto ativado.'
    );
  });
});
