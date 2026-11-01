import { describe, expect, it } from 'vitest';
import { Chain, Note } from '../../../src/domain/entities/index.js';

describe('Imported note timestamps', () => {
  const createdAt = '2024-03-12T14:30:00.000Z';

  it('cria tail com data de origem preservando posição final', () => {
    const note = Note.createTail({
      content: 'Documento importado',
      chainId: 'chain-1',
      position: 1,
      createdAt,
    });

    expect(note.createdAt).toBe(createdAt);
    expect(note.updatedAt).toBe(createdAt);
    expect(note.contentType).toBe('text');
  });

  it('anexa texto importado ao final da cadeia', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });
    const note = chain.appendImportedText('Documento importado', createdAt);

    expect(note.position.value).toBe(1);
    expect(note.createdAt).toBe(createdAt);
    expect(note.contentType).toBe('text');
    expect(chain.notes.at(-1)?.id).toBe(note.id);
  });
});
