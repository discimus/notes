import type { NoteContentType } from '@application/dto/index.js';

export interface NoteContentTypeMeta {
  label: string;
  icon: string;
  verbatim: boolean;
  spellcheck: boolean;
}

export const NOTE_CONTENT_TYPE_META: Record<
  NoteContentType,
  NoteContentTypeMeta
> = {
  text: {
    label: 'Texto',
    icon: 'notes',
    verbatim: false,
    spellcheck: true,
  },
  code: {
    label: 'Código',
    icon: 'code',
    verbatim: true,
    spellcheck: false,
  },
  markdown: {
    label: 'Markdown',
    icon: 'markdown',
    verbatim: true,
    spellcheck: false,
  },
};

export const NOTE_CONTENT_TYPE_OPTIONS: readonly NoteContentType[] = [
  'text',
  'code',
  'markdown',
];

export function isNoteContentType(value: unknown): value is NoteContentType {
  return value === 'text' || value === 'code' || value === 'markdown';
}

export function normalizeNoteContentType(value: unknown): NoteContentType {
  return isNoteContentType(value) ? value : 'text';
}

export function isVerbatimContentType(type: NoteContentType): boolean {
  return NOTE_CONTENT_TYPE_META[type].verbatim;
}
