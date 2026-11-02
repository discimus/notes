import { getSettings, setSettings } from '../../app/settings.js';
import {
  getAutoImportFiles,
  setAutoImportFiles,
} from '../../app/autoImportFiles.js';
import type { SettingDefinition, SettingsSection } from '../types.js';

export const behaviorSection: SettingsSection = {
  id: 'behavior',
  label: 'Comportamento',
  description: 'Confirmações e ações de proteção dos dados.',
  icon: 'tune',
  order: 30,
  keywords: ['exclusão', 'lixeira', 'confirmação', 'segurança'],
};

export const behaviorSettings: readonly SettingDefinition[] = [
  {
    id: 'behavior.confirm-before-trash',
    section: 'behavior',
    control: 'toggle',
    controlId: 'settings-confirm-trash',
    label: 'Confirmar antes de excluir',
    description:
      'Pede confirmação ao mover uma coleção para a lixeira. A exclusão permanente continua exigindo confirmação.',
    keywords: ['lixeira', 'excluir', 'confirmação'],
    defaultValue: true,
    get: () => getSettings().confirmBeforeTrash,
    set: (value) => setSettings({ confirmBeforeTrash: value }),
  },
  {
    id: 'behavior.auto-import-files',
    section: 'behavior',
    control: 'toggle',
    controlId: 'settings-auto-import-files',
    label: 'Importar arquivos automaticamente',
    description:
      'Importa os arquivos assim que forem soltos, sem abrir a confirmação. Arquivos duplicados continuam sendo ignorados.',
    keywords: ['importar', 'arquivo', 'confirmação', 'automático', 'lote'],
    defaultValue: false,
    get: getAutoImportFiles,
    set: setAutoImportFiles,
  },
];
