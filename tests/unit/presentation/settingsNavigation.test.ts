import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';

describe('navegação da modal de configurações', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    showSettingsDialog();
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
  });

  it('navega por clique e teclado entre as seções', () => {
    const appearance = document.querySelector<HTMLButtonElement>(
      '#settings-tab-appearance'
    )!;
    const notes = document.querySelector<HTMLButtonElement>('#settings-tab-notes')!;
    const behavior = document.querySelector<HTMLButtonElement>(
      '#settings-tab-behavior'
    )!;

    expect(appearance.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('#settings-panel-appearance')).not.toBeNull();

    notes.click();
    expect(notes.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('#settings-panel-notes')).not.toBeNull();
    expect(document.querySelector('#settings-notes-title')?.textContent).toBe(
      'Notas'
    );

    notes.focus();
    notes.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    expect(behavior.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(behavior);

    behavior.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
    );
    expect(appearance.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(appearance);
  });
});
