import { describe, expect, it } from 'vitest';
import { Note } from '../../../src/domain/entities/Note.js';

describe('Note — Markdown', () => {
  const chainId = 'chain-001';

  it('preserva espaços, quebras e indentação no Markdown', () => {
    const content = '# Título\n\n  - item\n\n```ts\nconst value = 1;\n```\n';
    const note = Note.createTail({
      content,
      chainId,
      position: 1,
      contentType: 'markdown',
    });

    expect(note.contentType).toBe('markdown');
    expect(note.content).toBe(content);
  });

  it('rejeita Markdown vazio', () => {
    expect(() =>
      Note.createHeader({
        content: '  \n',
        chainId,
        contentType: 'markdown',
      })
    ).toThrow();
  });
});
