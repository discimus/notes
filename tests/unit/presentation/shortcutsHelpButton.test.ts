import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@presentation/pages/render.js';
import { AppController } from '@presentation/pages/AppController.js';
import { appState } from '@presentation/state/AppState.js';

function press(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
}

describe('shortcuts help button', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    appState.set({
      view: 'chains',
      selectedChainId: null,
      chainSummaries: [],
      currentChain: null,
      chainFilterQuery: '',
      drawerOpen: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    document.querySelector<HTMLButtonElement>('#shortcuts-done')?.click();
    document.querySelector<HTMLButtonElement>('#shortcuts-close')?.click();
    document.querySelector<HTMLButtonElement>('#modal-cancel')?.click();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renderiza o botão de ajuda no canto inferior esquerdo e abre os atalhos', () => {
    const root = document.getElementById('app') as HTMLElement;
    renderApp(root);

    const button = root.querySelector<HTMLButtonElement>('#shortcuts-help-toggle');
    expect(button).not.toBeNull();
    expect(button?.classList.contains('shortcuts-help-button')).toBe(true);
    expect(button?.getAttribute('aria-label')).toBe('Atalhos de teclado');
    expect(button?.getAttribute('aria-haspopup')).toBe('dialog');

    button?.click();
    expect(document.querySelector('#shortcuts-dialog')).not.toBeNull();
  });

  it('conecta N ao documento em branco e Shift+N ao cadastro de coleção', () => {
    const root = document.getElementById('app') as HTMLElement;
    const openBlank = vi.spyOn(AppController, 'openBlankDocument').mockImplementation(() => {});
    renderApp(root);

    const blank = press('n');
    expect(openBlank).toHaveBeenCalledOnce();
    expect(blank.defaultPrevented).toBe(true);

    const collection = press('N', { shiftKey: true });
    expect(collection.defaultPrevented).toBe(true);
    expect(document.querySelector('#modal-title')?.textContent).toBe('Nova coleção');
  });
});
