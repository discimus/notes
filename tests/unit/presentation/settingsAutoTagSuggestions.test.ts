import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { showSettingsDialog } from '@presentation/components/SettingsDialog.js';
import { getAutoTagSuggestions } from '@presentation/app/autoTagSuggestions.js';
import { getAutoAssignTags } from '@presentation/app/autoAssignTags.js';
import { appState } from '@presentation/state/AppState.js';

describe('configurações de sugestões automáticas de tags', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    appState.set({
      tagSuggestionsEnabled: false,
      autoAssignTagsEnabled: false,
      tagSuggestionsByNoteId: {},
    });
    showSettingsDialog();
    document.querySelector<HTMLButtonElement>('#settings-tab-notes')?.click();
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#settings-done')?.click();
    document.body.innerHTML = '';
  });

  it('exibe os dois controles desligados por padrão', () => {
    const suggestions = document.querySelector<HTMLInputElement>(
      '#settings-auto-tag-suggestions'
    );
    const autoAssign = document.querySelector<HTMLInputElement>(
      '#settings-auto-assign-tags'
    );

    expect(suggestions?.checked).toBe(false);
    expect(autoAssign?.checked).toBe(false);
    expect(
      suggestions?.closest('.settings-item')?.querySelector('.settings-item__title')
        ?.textContent
    ).toBe('Sugestões automáticas de tags');
  });

  it('aplica e persiste as preferências imediatamente', () => {
    const suggestions = document.querySelector<HTMLInputElement>(
      '#settings-auto-tag-suggestions'
    );
    const autoAssign = document.querySelector<HTMLInputElement>(
      '#settings-auto-assign-tags'
    );
    if (!suggestions || !autoAssign) throw new Error('Switches não encontrados');

    suggestions.checked = true;
    suggestions.dispatchEvent(new Event('change', { bubbles: true }));
    autoAssign.checked = true;
    autoAssign.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getAutoTagSuggestions()).toBe(true);
    expect(getAutoAssignTags()).toBe(true);
    expect(appState.get().tagSuggestionsEnabled).toBe(true);
    expect(appState.get().autoAssignTagsEnabled).toBe(true);
    expect(document.querySelector('#settings-status')?.textContent).toBe(
      'Atribuir tags automaticamente ativado.'
    );
  });
});
