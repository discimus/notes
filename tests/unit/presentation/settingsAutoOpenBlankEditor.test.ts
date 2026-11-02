import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAutoOpenBlankEditor,
  setAutoOpenBlankEditor,
} from '@presentation/app/autoOpenBlankEditor.js';
import { SETTINGS_DEFINITIONS } from '@presentation/settings/registry.js';

describe('Configuração de abrir editor em branco', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fica desativada por padrão e persiste a preferência', () => {
    expect(getAutoOpenBlankEditor()).toBe(false);

    setAutoOpenBlankEditor(true);
    expect(getAutoOpenBlankEditor()).toBe(true);
    expect(localStorage.getItem('threadnotes.auto-open-blank-editor')).toBe(
      'true'
    );
  });

  it('expõe a configuração na seção de notas', () => {
    const setting = SETTINGS_DEFINITIONS.find(
      (item) => item.id === 'notes.auto-open-blank-editor'
    );

    expect(setting?.section).toBe('notes');
    expect(setting?.defaultValue).toBe(false);
    if (!setting || setting.control !== 'toggle') {
      throw new Error('Configuração toggle não encontrada');
    }
    setting.set(true);
    expect(setting.get()).toBe(true);
  });
});
