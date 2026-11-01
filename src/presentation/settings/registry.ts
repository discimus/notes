import { appearanceSection, appearanceSettings } from './definitions/appearance.js';
import { behaviorSection, behaviorSettings } from './definitions/behavior.js';
import { notesSection, notesSettings } from './definitions/notes.js';
import type { SettingDefinition, SettingsSection, SettingsSectionId } from './types.js';

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  appearanceSection,
  notesSection,
  behaviorSection,
].sort((a, b) => a.order - b.order);

export const SETTINGS_DEFINITIONS: readonly SettingDefinition[] = [
  ...appearanceSettings,
  ...notesSettings,
  ...behaviorSettings,
];

export function settingsForSection(
  sectionId: SettingsSectionId
): readonly SettingDefinition[] {
  return SETTINGS_DEFINITIONS.filter((setting) => setting.section === sectionId);
}

export function sectionById(
  sectionId: SettingsSectionId
): SettingsSection | null {
  return SETTINGS_SECTIONS.find((section) => section.id === sectionId) ?? null;
}
