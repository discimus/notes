import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAutoTagSuggestions,
  initAutoTagSuggestions,
  setAutoTagSuggestions,
} from '@presentation/app/autoTagSuggestions.js';
import { appState } from '@presentation/state/AppState.js';

describe('sugestões de tags ativas por padrão', () => {
  beforeEach(() => {
    localStorage.clear();
    appState.set({
      tagSuggestionsEnabled: false,
      tagSuggestionsByNoteId: {},
    });
  });

  it('ativa a preferência quando não há valor persistido', () => {
    expect(getAutoTagSuggestions()).toBe(true);

    initAutoTagSuggestions();

    expect(appState.get().tagSuggestionsEnabled).toBe(true);
  });

  it('respeita a desativação explícita do usuário', () => {
    setAutoTagSuggestions(false);
    initAutoTagSuggestions();

    expect(getAutoTagSuggestions()).toBe(false);
    expect(appState.get().tagSuggestionsEnabled).toBe(false);
    expect(localStorage.getItem('threadnotes.tag-suggestions-enabled')).toBe('false');
  });
});
