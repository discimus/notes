import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE,
  applyPalette,
  getStoredPalette,
  initPalette,
  setPalette,
} from '@presentation/app/palette.js';

describe('paletas de cores', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-palette');
    document.head.innerHTML = '<meta name="theme-color" content="#6750A4" />';
  });

  it('usa violeta como padrão', () => {
    expect(DEFAULT_PALETTE).toBe('violet');
    expect(getStoredPalette()).toBe('violet');
  });

  it('persiste e aplica a paleta escolhida', () => {
    setPalette('blue');

    expect(getStoredPalette()).toBe('blue');
    expect(localStorage.getItem('threadnotes.palette')).toBe('blue');
    expect(document.documentElement.getAttribute('data-palette')).toBe('blue');
    expect(
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.getAttribute('content')
    ).toBe('#1565C0');
  });

  it('restaura a paleta salva e ignora valores inválidos', () => {
    localStorage.setItem('threadnotes.palette', 'teal');
    initPalette();
    expect(document.documentElement.getAttribute('data-palette')).toBe('teal');

    localStorage.setItem('threadnotes.palette', 'invalida');
    expect(getStoredPalette()).toBe('violet');
  });

  it('atualiza o meta theme-color sem depender de storage', () => {
    applyPalette('rose');

    expect(
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.getAttribute('content')
    ).toBe('#D81B60');
  });
});
