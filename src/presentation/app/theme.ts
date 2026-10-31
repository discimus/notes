import { appState } from '../state/AppState.js';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'threadnotes.theme';

const mediaQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function getSystemTheme(): 'light' | 'dark' {
  return mediaQuery?.matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function applyTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = resolved;
}

export function setTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable in private mode; the in-memory theme still applies.
  }
  applyTheme(preference);
  appState.set({ theme: preference });
}

export function cycleTheme(): void {
  const current = appState.get().theme;
  const next: ThemePreference =
    current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
  setTheme(next);
}

export function initTheme(): void {
  const preference = getStoredTheme();
  applyTheme(preference);
  appState.set({ theme: preference });

  mediaQuery?.addEventListener('change', () => {
    if (appState.get().theme === 'system') applyTheme('system');
  });
}

export function themeIcon(preference: ThemePreference): string {
  if (preference === 'system') return 'brightness_auto';
  return preference === 'dark' ? 'light_mode' : 'dark_mode';
}

export function themeLabel(preference: ThemePreference): string {
  if (preference === 'system') return 'Tema: sistema';
  return preference === 'dark' ? 'Tema: escuro' : 'Tema: claro';
}
