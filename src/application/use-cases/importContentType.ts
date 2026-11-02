import type { NoteContentType } from '@domain/entities/index.js';

const MARKDOWN_EXTENSIONS = new Set([
  'md',
  'markdown',
  'mdown',
  'mkd',
  'mkdn',
  'mdwn',
  'mdtxt',
  'mdtext',
]);

export function importContentTypeFromFileName(
  sourceFileName?: string
): NoteContentType {
  if (!sourceFileName) return 'text';

  const fileName = sourceFileName.trim().toLowerCase();
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return 'text';

  return MARKDOWN_EXTENSIONS.has(fileName.slice(dot + 1))
    ? 'markdown'
    : 'text';
}
