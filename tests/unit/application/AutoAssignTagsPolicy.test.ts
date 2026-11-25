import { describe, expect, it } from 'vitest';
import type { NoteTagSuggestionDTO } from '@application/dto/index.js';
import { selectAutoAssignSuggestions } from '@application/tagSuggestions/autoAssign.js';

function suggestion(
  name: string,
  score: number,
  options: Partial<NoteTagSuggestionDTO> = {}
): NoteTagSuggestionDTO {
  return {
    noteId: 'note-1',
    name,
    normalizedName: name,
    score,
    isNew: false,
    sources: ['test'],
    ...options,
  };
}

describe('política de auto-atribuição', () => {
  it('não cria tags novas específicas automaticamente', () => {
    const selected = selectAutoAssignSuggestions(
      [
        suggestion('typescript', 0.95, { isNew: true }),
        suggestion('programacao', 0.9, { isNew: true, isStandard: true }),
        suggestion('pesquisa', 0.9),
      ],
      0
    );

    expect(selected.map((item) => item.name)).not.toContain('typescript');
    expect(selected.map((item) => item.name)).toContain('programacao');
    expect(selected.map((item) => item.name)).toContain('pesquisa');
  });

  it('não atribui nada quando só existem tags novas específicas', () => {
    expect(
      selectAutoAssignSuggestions(
        [suggestion('entity-framework', 0.99, { isNew: true })],
        0
      )
    ).toEqual([]);
  });
});
