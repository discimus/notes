import { describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import { InvariantViolationError } from '@shared/types/index.js';

describe('Chain.removeNote', () => {
  it('remove uma tail e reindexa as notas restantes', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header', title: 'Projeto' });
    const second = chain.appendNote('Segunda');
    chain.appendNote('Terceira');

    const removed = chain.removeNote(second.id);

    expect(removed.id).toBe(second.id);
    expect(chain.notes.map((note) => note.content)).toEqual([
      'Header',
      'Terceira',
    ]);
    expect(chain.notes.map((note) => note.position.value)).toEqual([0, 1]);
    expect(chain.headerNoteId).toBe(chain.notes[0]?.id);
  });

  it('remove o header e mantém a coleção headerless com tails a partir de 1', () => {
    const { chain, header } = Chain.createWithHeader({
      content: 'Header',
      title: 'Projeto',
    });
    chain.appendNote('Tail');
    chain.appendNote('Outra tail');

    chain.removeNote(header.id);

    expect(chain.headerNoteId).toBeUndefined();
    expect(chain.notes).toHaveLength(2);
    expect(chain.notes.map((note) => note.isHeader())).toEqual([false, false]);
    expect(chain.notes.map((note) => note.position.value)).toEqual([1, 2]);
    expect(chain.displayTitle).toBe('Projeto');
  });

  it('rejeita uma nota que não pertence à coleção', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });

    expect(() => chain.removeNote('missing-note')).toThrow(
      InvariantViolationError
    );
  });
});
