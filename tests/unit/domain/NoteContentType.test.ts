import { describe, expect, it } from 'vitest';
import { Note } from '../../../src/domain/entities/Note.js';

describe('Note content type', () => {
  const chainId = 'chain-001';

  it('usa texto como padrão e mantém o trim do texto', () => {
    const note = Note.createHeader({ content: '  Conteúdo  ', chainId });

    expect(note.contentType).toBe('text');
    expect(note.content).toBe('Conteúdo');
  });

  it('preserva espaços e indentação quando o conteúdo é código', () => {
    const content = '  const value = 1;\n\n  return value;\n';
    const note = Note.createTail({
      content,
      chainId,
      position: 1,
      contentType: 'code',
    });

    expect(note.contentType).toBe('code');
    expect(note.content).toBe(content);
  });

  it('serializa o tipo e assume texto em registros legados', () => {
    const code = Note.createHeader({
      content: 'const x = 1;',
      chainId,
      contentType: 'code',
    });
    expect(code.toData().contentType).toBe('code');

    const legacy = Note.reconstitute({
      id: 'legacy-note',
      content: 'Texto legado',
      chainId,
      position: 0,
      role: 'header',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(legacy.contentType).toBe('text');
  });

  it('atualiza conteúdo e tipo preservando código', () => {
    const note = Note.createHeader({ content: 'Inicial', chainId });
    const content = 'function run() {\n  return true;\n}';

    note.updateContent(content, 'code');

    expect(note.contentType).toBe('code');
    expect(note.content).toBe(content);
  });

  it('rejeita código vazio', () => {
    expect(() =>
      Note.createHeader({ content: '   \n', chainId, contentType: 'code' })
    ).toThrow();
  });
});
