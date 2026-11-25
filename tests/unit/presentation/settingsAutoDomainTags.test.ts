import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getAutoDomainTags,
  setAutoDomainTags,
} from '@presentation/app/autoDomainTags.js';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { appState } from '@presentation/state/AppState.js';

describe('configuração de tags automáticas de domínio', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    appState.set({ autoDomainTagsEnabled: true });
    setAutoDomainTags(true);
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
  });

  it('vem ativada por padrão e pode ser desativada', () => {
    expect(getAutoDomainTags()).toBe(true);

    setAutoDomainTags(false);
    expect(getAutoDomainTags()).toBe(false);
    expect(appState.get().autoDomainTagsEnabled).toBe(false);
  });

  it('aparece nas configurações de Notas e aplica a mudança', () => {
    showSettingsDialog();
    document.querySelector<HTMLButtonElement>('#settings-tab-notes')?.click();

    const toggle = document.querySelector<HTMLInputElement>(
      '#settings-auto-domain-tags'
    );
    expect(toggle?.checked).toBe(true);

    if (!toggle) throw new Error('Toggle não encontrado');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getAutoDomainTags()).toBe(false);
    expect(appState.get().autoDomainTagsEnabled).toBe(false);
  });
});
