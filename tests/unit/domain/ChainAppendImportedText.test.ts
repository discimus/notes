import { describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';

describe('Chain.appendImportedText content type', () => {
  it('cria tail de texto por padrao', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });

    const note = chain.appendImportedText('Conteudo');

    expect(note.contentType).toBe('text');
    expect(note.content).toBe('Conteudo');
  });

  it('cria tail markdown preservando o conteudo original', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });
    const content = '# Titulo\n\n  - item com indentacao\n';

    const note = chain.appendImportedText(content, undefined, {
      contentType: 'markdown',
      sourceFileName: 'nota.md',
    });

    expect(note.contentType).toBe('markdown');
    expect(note.content).toBe(content);
    expect(note.sourceFileName).toBe('nota.md');
  });

  it('usa extensao md no nome automatico de notas markdown', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });

    const note = chain.appendImportedText('# Titulo', undefined, {
      contentType: 'markdown',
    });

    expect(note.contentType).toBe('markdown');
    expect(note.sourceFileName).toMatch(/\.md$/);
  });
});
