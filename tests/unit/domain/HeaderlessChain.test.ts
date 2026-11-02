import { describe, expect, it } from 'vitest';
import { Chain, Note } from '../../../src/domain/entities/index.js';
import { ValidationError } from '../../../src/shared/types/index.js';

describe('Headerless Chain', () => {
  it('cria coleção apenas com título e sem notas', () => {
    const chain = Chain.create({ title: '  Projeto novo  ' });

    expect(chain.title).toBe('Projeto novo');
    expect(chain.displayTitle).toBe('Projeto novo');
    expect(chain.notes).toHaveLength(0);
    expect(chain.noteCount).toBe(0);
    expect(chain.headerNoteId).toBeUndefined();
  });

  it('exige título não vazio', () => {
    expect(() => Chain.create({ title: '   ' })).toThrow(ValidationError);
  });

  it('adiciona a primeira nota como tail na posição 1', () => {
    const chain = Chain.create({ title: 'Projeto' });
    const first = chain.appendNote('Primeira nota');
    const second = chain.appendNote('Segunda nota');

    expect(first.role).toBe('tail');
    expect(first.position.value).toBe(1);
    expect(second.position.value).toBe(2);
    expect(chain.notes).toHaveLength(2);
    expect(chain.headerNoteId).toBeUndefined();
  });

  it('importa texto como tail em coleção headerless', () => {
    const chain = Chain.create({ title: 'Importados' });
    const note = chain.appendImportedText(
      'Documento',
      '2024-03-12T14:30:00.000Z'
    );

    expect(note.role).toBe('tail');
    expect(note.position.value).toBe(1);
    expect(note.createdAt).toBe('2024-03-12T14:30:00.000Z');
  });

  it('reconstitui coleção vazia e coleção headerless com tails', () => {
    const empty = Chain.create({ title: 'Vazia' });
    const restoredEmpty = Chain.reconstitute(empty.toData(), []);
    expect(restoredEmpty.notes).toHaveLength(0);

    const withNotes = Chain.create({ title: 'Com notas' });
    const note = withNotes.appendNote('Conteúdo');
    const restored = Chain.reconstitute(
      withNotes.toData(),
      [Note.reconstitute(note.toData())]
    );

    expect(restored.notes).toHaveLength(1);
    expect(restored.notes[0]?.role).toBe('tail');
  });
});
