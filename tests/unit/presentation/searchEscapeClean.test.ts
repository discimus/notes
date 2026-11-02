import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';
import { renderSearchLayout } from '@presentation/views/search.js';

function pressEscape(input: HTMLInputElement): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  return event;
}

describe('Escape na pesquisa', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({
      view: 'search',
      searchQuery: '',
      searchResults: [],
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('volta para o editor quando o campo está limpo', () => {
    const navigate = vi.spyOn(AppController, 'navigateTo').mockResolvedValue(undefined);
    const layout = renderSearchLayout(appState.get());
    document.body.appendChild(layout);
    const input = layout.querySelector<HTMLInputElement>('#search-input-main')!;

    const event = pressEscape(input);

    expect(navigate).toHaveBeenCalledWith('editor');
    expect(event.defaultPrevented).toBe(true);
  });

  it('não volta para o editor quando há texto no campo', () => {
    const navigate = vi.spyOn(AppController, 'navigateTo').mockResolvedValue(undefined);
    const layout = renderSearchLayout(appState.get());
    document.body.appendChild(layout);
    const input = layout.querySelector<HTMLInputElement>('#search-input-main')!;
    input.value = 'consulta';

    const event = pressEscape(input);

    expect(navigate).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
