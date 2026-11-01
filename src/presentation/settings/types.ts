export type SettingsSectionId = 'appearance' | 'notes' | 'behavior';

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: string;
  order: number;
  keywords?: readonly string[];
}

export interface SettingsRadioOption {
  value: string;
  label: string;
  description?: string;
}

interface SettingBase {
  id: string;
  section: SettingsSectionId;
  label: string;
  description: string;
  controlId?: string;
  keywords?: readonly string[];
}

export interface ToggleSettingDefinition extends SettingBase {
  control: 'toggle';
  defaultValue: boolean;
  get: () => boolean;
  set: (value: boolean) => void;
}

export interface RadioSettingDefinition extends SettingBase {
  control: 'radio';
  defaultValue: string;
  options: readonly SettingsRadioOption[];
  get: () => string;
  set: (value: string) => void;
}

export type SettingDefinition =
  | ToggleSettingDefinition
  | RadioSettingDefinition;
