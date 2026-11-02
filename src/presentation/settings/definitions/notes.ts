import { appState } from '../../state/AppState.js';
import {
  getAutoOpenBlankEditor,
  setAutoOpenBlankEditor,
} from '../../app/autoOpenBlankEditor.js';
import {
  getAutoTagSuggestions,
  setAutoTagSuggestions,
} from '../../app/autoTagSuggestions.js';
import {
  getAutoAssignTags,
  setAutoAssignTags,
} from '../../app/autoAssignTags.js';
import {
  setFullNoteContent,
} from '../../app/noteContentDisplay.js';
import {
  setNoteImageLayout,
  type NoteImageLayout,
} from '../../app/noteImageLayout.js';
import type { SettingDefinition, SettingsSection } from '../types.js';

export const notesSection: SettingsSection = {
  id: 'notes',
  label: 'Notas',
  description: 'Conteúdo, imagens e apresentação das notas.',
  icon: 'description',
  order: 20,
  keywords: ['notas', 'conteúdo', 'imagens', 'anexos'],
};

export const notesSettings: readonly SettingDefinition[] = [
  {
    id: 'notes.full-content',
    section: 'notes',
    control: 'toggle',
    controlId: 'settings-full-note-content',
    label: 'Conteúdo completo das notas',
    description:
      'Exibe todo o conteúdo no histórico da coleção, sem limite de linhas.',
    keywords: ['texto', 'código', 'linhas', 'histórico'],
    defaultValue: false,
    get: () => appState.get().fullNoteContent,
    set: setFullNoteContent,
  },
  {
    id: 'notes.image-layout',
    section: 'notes',
    control: 'radio',
    controlId: 'settings-image-layout',
    label: 'Layout das imagens',
    description: 'Controla como as imagens anexadas aparecem nas notas.',
    keywords: ['miniaturas', 'coluna', 'imagem', 'anexo'],
    defaultValue: 'thumbnails',
    options: [
      {
        value: 'thumbnails',
        label: 'Miniaturas',
        description: 'Mantém a grade atual com dimensões fixas.',
      },
      {
        value: 'column',
        label: 'Largura da nota',
        description: 'Uma imagem por linha, até a largura da coluna.',
      },
    ],
    get: () => appState.get().noteImageLayout,
    set: (value) => setNoteImageLayout(value as NoteImageLayout),
  },
  {
    id: 'notes.auto-open-blank-editor',
    section: 'notes',
    control: 'toggle',
    controlId: 'settings-auto-open-blank-editor',
    label: 'Abrir editor em branco',
    description:
      'Ao acessar uma coleção, abre automaticamente um documento em branco no editor.',
    keywords: ['editor', 'documento', 'branco', 'coleção', 'abrir'],
    defaultValue: false,
    get: getAutoOpenBlankEditor,
    set: setAutoOpenBlankEditor,
  },
  {
    id: 'notes.auto-tag-suggestions',
    section: 'notes',
    control: 'toggle',
    controlId: 'settings-auto-tag-suggestions',
    label: 'Sugestões automáticas de tags',
    description:
      'Mostra sugestões de tags nas notas com base no conteúdo, sem atribuí-las automaticamente.',
    keywords: ['tag', 'sugestão', 'automático', 'conteúdo'],
    defaultValue: false,
    get: getAutoTagSuggestions,
    set: setAutoTagSuggestions,
  },
  {
    id: 'notes.auto-assign-tags',
    section: 'notes',
    control: 'toggle',
    controlId: 'settings-auto-assign-tags',
    label: 'Atribuir tags automaticamente',
    description:
      'Adiciona até 3 tags por nota usando as sugestões mais relevantes. Requer sugestões automáticas ativadas.',
    keywords: ['tag', 'atribuição', 'automático', 'sugestão'],
    defaultValue: false,
    get: getAutoAssignTags,
    set: setAutoAssignTags,
  },
];
