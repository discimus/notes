import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAutoTagSuggestions,
  initAutoTagSuggestions,
  setAutoTagSuggestions,
} from '@presentation/app/autoTagSuggestions.js';
import {
  getAutoAssignTags,
  initAutoAssignTags,
  setAutoAssignTags,
} from '@presentation/app/autoAssignTags.js';
import { appState } from '@presentation/state/AppState.js';
import { TAG_SUGGESTION_CACHE_KEY } from '@infrastructure/persistence/LocalTagSuggestionCache.js';

describe('preferências de sugestões automáticas', () => {
  beforeEach(() => {
    localStorage.clear();
    appState.set({
      tagSuggestionsEnabled: false,
      autoAssignTagsEnabled: false,
      tagSuggestionsByNoteId: {},
    });
  });

  it('inicia desativada e persiste a preferência', () => {
    expect(getAutoTagSuggestions()).toBe(false);
    expect(getAutoAssignTags()).toBe(false);

    setAutoTagSuggestions(true);
    setAutoAssignTags(true);
    initAutoTagSuggestions();
    initAutoAssignTags();

    expect(appState.get().tagSuggestionsEnabled).toBe(true);
    expect(appState.get().autoAssignTagsEnabled).toBe(true);
    expect(localStorage.getItem('threadnotes.tag-suggestions-enabled')).toBe('true');
    expect(localStorage.getItem('threadnotes.auto-assign-tags')).toBe('true');
  });

  it('desativar limpa apenas as sugestões visíveis e preserva o cache', () => {
    localStorage.setItem(TAG_SUGGESTION_CACHE_KEY, '{"note-1":{}}');
    appState.set({
      tagSuggestionsEnabled: true,
      tagSuggestionsByNoteId: { 'note-1': [] },
    });

    setAutoTagSuggestions(false);

    expect(appState.get().tagSuggestionsEnabled).toBe(false);
    expect(appState.get().tagSuggestionsByNoteId).toEqual({});
    expect(localStorage.getItem(TAG_SUGGESTION_CACHE_KEY)).toBe('{"note-1":{}}');
  });
});
