import { beforeEach, describe, expect, it } from 'vitest';
import { resolveTheme, setTheme } from '@presentation/app/theme.js';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persiste e aplica o tema escuro', () => {
    setTheme('dark');

    expect(localStorage.getItem('threadnotes.theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('resolve o tema do sistema para claro no ambiente de teste', () => {
    expect(resolveTheme('system')).toBe('light');
  });
});
