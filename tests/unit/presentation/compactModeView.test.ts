import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@presentation/pages/render.js';
import { appState } from '@presentation/state/AppState.js';

describe('modo compacto na interface', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    appState.set({
      view: 'chains',
      drawerOpen: false,
      compactMode: false,
      isLoading: false,
      error: null,
    });
  });

  it('aplica e remove a densidade sem alterar a estrutura da interface', async () => {
    const root = document.getElementById('app') as HTMLElement;
    renderApp(root);

    const shell = root.querySelector<HTMLElement>('.app-shell');
    const compactButton = root.querySelector<HTMLButtonElement>('#compact-toggle');

    expect(compactButton?.getAttribute('aria-pressed')).toBe('false');
    expect(
      compactButton?.querySelector('.material-symbols-rounded')?.textContent
    ).toBe('compress');
    expect(shell?.classList.contains('app-shell--compact')).toBe(false);
    expect(root.querySelector('#nav-drawer')).not.toBeNull();
    expect(root.querySelector('#app-topbar')).toBeNull();
    expect(root.querySelector('#compact-restore')).toBeNull();

    compactButton?.click();

    await vi.waitFor(() => {
      expect(shell?.classList.contains('app-shell--compact')).toBe(true);
    });
    expect(appState.get().compactMode).toBe(true);
    expect(compactButton?.getAttribute('aria-pressed')).toBe('true');
    expect(
      compactButton?.querySelector('.material-symbols-rounded')?.textContent
    ).toBe('expand'    );
    expect(root.querySelector('#nav-drawer')).not.toBeNull();
    expect(root.querySelector('#app-topbar')).toBeNull();
    expect(localStorage.getItem('threadnotes.compact-mode')).toBe('true');

    compactButton?.click();

    await vi.waitFor(() => {
      expect(shell?.classList.contains('app-shell--compact')).toBe(false);
    });
    expect(appState.get().compactMode).toBe(false);
    expect(compactButton?.getAttribute('aria-pressed')).toBe('false');
    expect(
      compactButton?.querySelector('.material-symbols-rounded')?.textContent
    ).toBe('compress');
    expect(localStorage.getItem('threadnotes.compact-mode')).toBe('false');
  });
});
