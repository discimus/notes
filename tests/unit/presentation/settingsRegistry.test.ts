import { describe, expect, it } from 'vitest';
import {
  SETTINGS_DEFINITIONS,
  SETTINGS_SECTIONS,
  sectionById,
  settingsForSection,
} from '@presentation/settings/registry.js';

describe('registry de configurações', () => {
  it('ordena as seções e expõe metadados de busca', () => {
    expect(SETTINGS_SECTIONS.map((section) => section.id)).toEqual([
      'appearance',
      'notes',
      'behavior',
    ]);
    SETTINGS_SECTIONS.forEach((section) => {
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.icon.length).toBeGreaterThan(0);
      expect(section.description.length).toBeGreaterThan(0);
    });
    expect(sectionById('notes')?.label).toBe('Notas');
    expect(sectionById('missing' as never)).toBeNull();
  });

  it('mantém IDs únicos e controles válidos', () => {
    const ids = SETTINGS_DEFINITIONS.map((setting) => setting.id);
    expect(new Set(ids).size).toBe(ids.length);

    SETTINGS_DEFINITIONS.forEach((setting) => {
      expect(setting.label.length).toBeGreaterThan(0);
      expect(setting.description.length).toBeGreaterThan(0);
      if (setting.control === 'radio') {
        expect(setting.options.length).toBeGreaterThan(1);
        expect(setting.options.some((option) => option.value === setting.defaultValue)).toBe(
          true
        );
      }
    });
  });

  it('filtra configurações por seção', () => {
    expect(settingsForSection('appearance').map((setting) => setting.id)).toEqual([
      'appearance.theme',
      'appearance.compact-mode',
    ]);
    expect(settingsForSection('notes').map((setting) => setting.id)).toEqual([
      'notes.full-content',
      'notes.image-layout',
      'notes.auto-open-blank-editor',
    ]);
    expect(settingsForSection('behavior')).toHaveLength(1);
  });
});
