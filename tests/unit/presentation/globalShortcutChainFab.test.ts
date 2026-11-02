import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initGlobalShortcuts } from '@presentation/app/shortcuts.js';
import { appState } from '@presentation/state/AppState.js';

let cleanup: (() => void) | null = null;

describe('atalho N com FAB Documento no DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    appState.set({ view: 'editor', isLoading: false });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = null;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('aciona o FAB da coleção antes de qualquer abertura global', () => {
    document.body.innerHTML =
      '<button id="chain-action-document" type="button">Documento</button>';
    const action = document.querySelector<HTMLButtonElement>(
      '#chain-action-document'
    )!;
    const click = vi.spyOn(action, 'click');
    cleanup = initGlobalShortcuts();

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'n',
        bubbles: true,
        cancelable: true,
      })
    );

    expect(click).toHaveBeenCalledOnce();
  });
});
