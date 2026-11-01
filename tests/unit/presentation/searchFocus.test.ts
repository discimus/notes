import { beforeEach, describe, expect, it } from 'vitest';
import { appState } from '@presentation/state/AppState.js';
import { renderSearchLayout } from '@presentation/views/search.js';

describe('Foco na busca', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'search',
      searchQuery: '',
      searchResults: [],
      isLoading: false,
    });
  });

  it('foca o campo de busca depois de montar a tela', async () => {
    const layout = renderSearchLayout(appState.get());
    document.body.appendChild(layout);

    await Promise.resolve();

    expect(document.activeElement).toBe(
      layout.querySelector('#search-input-main')
    );
  });
});
