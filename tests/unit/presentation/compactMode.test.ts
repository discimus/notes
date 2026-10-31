import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCompactMode,
  initCompactMode,
  setCompactMode,
  toggleCompactMode,
} from '@presentation/app/compactMode.js';
import { appState } from '@presentation/state/AppState.js';

describe('modo compacto', () => {
  beforeEach(() => {
    localStorage.clear();
    appState.set({ compactMode: false, drawerOpen: false });
  });

  it('inicia desativado e persiste a preferência', () => {
    expect(getCompactMode()).toBe(false);

    setCompactMode(true);
    expect(getCompactMode()).toBe(true);

    setCompactMode(false);
    expect(getCompactMode()).toBe(false);
  });

  it('inicializa o AppState a partir do localStorage', () => {
    setCompactMode(true);
    initCompactMode();

    expect(appState.get().compactMode).toBe(true);
  });

  it('alterna o estado preservando a navegação', () => {
    appState.set({ drawerOpen: true });

    expect(toggleCompactMode()).toBe(true);
    expect(appState.get().compactMode).toBe(true);
    expect(appState.get().drawerOpen).toBe(true);
    expect(getCompactMode()).toBe(true);

    expect(toggleCompactMode()).toBe(false);
    expect(appState.get().compactMode).toBe(false);
    expect(getCompactMode()).toBe(false);
  });
});
