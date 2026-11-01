import { appState } from '../../state/AppState.js';
import { updateCompactMode } from '../../app/compactMode.js';
import { setTheme, type ThemePreference } from '../../app/theme.js';
import type { SettingDefinition, SettingsSection } from '../types.js';

export const appearanceSection: SettingsSection = {
  id: 'appearance',
  label: 'Aparência',
  description: 'Tema e densidade da interface.',
  icon: 'palette',
  order: 10,
  keywords: ['tema', 'cores', 'densidade', 'layout'],
};

export const appearanceSettings: readonly SettingDefinition[] = [
  {
    id: 'appearance.theme',
    section: 'appearance',
    control: 'radio',
    controlId: 'settings-theme',
    label: 'Tema',
    description: 'Define a aparência visual da aplicação.',
    keywords: ['claro', 'escuro', 'sistema', 'cor'],
    defaultValue: 'system',
    options: [
      {
        value: 'system',
        label: 'Sistema',
        description: 'Segue a preferência do dispositivo.',
      },
      {
        value: 'light',
        label: 'Claro',
        description: 'Mantém a interface clara.',
      },
      {
        value: 'dark',
        label: 'Escuro',
        description: 'Mantém a interface escura.',
      },
    ],
    get: () => appState.get().theme,
    set: (value) => setTheme(value as ThemePreference),
  },
  {
    id: 'appearance.compact-mode',
    section: 'appearance',
    control: 'toggle',
    controlId: 'settings-compact-mode',
    label: 'Modo compacto',
    description: 'Reduz espaçamentos e dimensões sem ocultar a navegação.',
    keywords: ['densidade', 'espaçamento', 'compacto'],
    defaultValue: false,
    get: () => appState.get().compactMode,
    set: updateCompactMode,
  },
];
