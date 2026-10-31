import { describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { groupNotesByDate } from '@presentation/app/editorGrouping.js';

function makeNote(id: string, createdAt: string): NoteDTO {
  return {
    id,
    content: id,
    chainId: 'chain-1',
    position: 0,
    role: 'tail',
    createdAt,
    updatedAt: createdAt,
  };
}

describe('groupNotesByDate', () => {
  it('agrupa notas do mesmo dia e preserva a ordem cronológica', () => {
    const groups = groupNotesByDate([
      makeNote('note-2', '2026-01-02T11:00:00.000Z'),
      makeNote('note-1', '2026-01-02T09:00:00.000Z'),
      makeNote('note-3', '2026-01-03T08:00:00.000Z'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.notes.map((note) => note.id)).toEqual(['note-1', 'note-2']);
    expect(groups[1]?.notes.map((note) => note.id)).toEqual(['note-3']);
    expect(groups[0]?.fullLabel).toContain('2026');
  });
});
