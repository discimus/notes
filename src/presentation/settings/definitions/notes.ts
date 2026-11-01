import { appState } from '../../state/AppState.js';
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
      'Exibe todo o conteúdo no histórico da cadeia, sem limite de linhas.',
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
];
