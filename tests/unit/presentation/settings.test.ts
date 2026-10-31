import { beforeEach, describe, expect, it } from 'vitest';
import { getSettings, setSettings } from '@presentation/app/settings.js';

describe('configurações', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('usa confirmação ativada por padrão', () => {
    expect(getSettings()).toEqual({ confirmBeforeTrash: true });
  });

  it('volta ao padrão quando o valor salvo é inválido', () => {
    localStorage.setItem('threadnotes.settings', '{invalid');
    expect(getSettings()).toEqual({ confirmBeforeTrash: true });

    localStorage.setItem('threadnotes.settings', JSON.stringify({ confirmBeforeTrash: 'nao' }));
    expect(getSettings()).toEqual({ confirmBeforeTrash: true });
  });

  it('persiste a preferência desativada', () => {
    setSettings({ confirmBeforeTrash: false });

    expect(getSettings()).toEqual({ confirmBeforeTrash: false });
    expect(localStorage.getItem('threadnotes.settings')).toBe(
      JSON.stringify({ confirmBeforeTrash: false })
    );
  });
});
