import { describe, expect, it } from 'vitest';
import { NoteTag } from '@domain/entities/index.js';

describe('NoteTag', () => {
  it('cria associação entre nota, cadeia e tag', () => {
    const noteTag = NoteTag.create('note-1', 'chain-1', 'tag-1');

    expect(noteTag.noteId).toBe('note-1');
    expect(noteTag.chainId).toBe('chain-1');
    expect(noteTag.tagId).toBe('tag-1');
    expect(noteTag.assignedAt).toBeTruthy();
  });

  it('reconstitui e serializa os dados persistidos', () => {
    const data = {
      noteId: 'note-1',
      chainId: 'chain-1',
      tagId: 'tag-1',
      assignedAt: '2026-01-02T10:00:00.000Z',
    };

    const noteTag = NoteTag.reconstitute(data);

    expect(noteTag.toData()).toEqual(data);
  });
});
