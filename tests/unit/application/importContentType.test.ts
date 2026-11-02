import { describe, expect, it } from 'vitest';
import { importContentTypeFromFileName } from '@application/use-cases/importContentType.js';

describe('importContentTypeFromFileName', () => {
  it.each([
    'nota.md',
    'NOTA.MD',
    'nota.markdown',
    'nota.mdown',
    'nota.mkd',
    'nota.mkdn',
    'nota.mdwn',
    'nota.mdtxt',
    'nota.mdtext',
    'pasta\\subpasta\\nota.md',
    'pasta/subpasta/nota.markdown',
  ])('identifica %s como markdown', (fileName) => {
    expect(importContentTypeFromFileName(fileName)).toBe('markdown');
  });

  it.each([
    'nota.txt',
    'nota.md.txt',
    'nota',
    '.md',
    'nota.md/arquivo',
    '',
  ])('mantem %s como texto', (fileName) => {
    expect(importContentTypeFromFileName(fileName)).toBe('text');
  });

  it('usa texto quando o nome do arquivo nao foi informado', () => {
    expect(importContentTypeFromFileName()).toBe('text');
  });
});
