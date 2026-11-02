import { describe, expect, it } from 'vitest';
import type { NoteTagSuggestionDTO } from '@application/dto/index.js';
import {
  MAX_AUTO_TAGS_PER_NOTE,
  selectAutoAssignSuggestions,
} from '@application/tagSuggestions/autoAssign.js';

function suggestion(name: string, score: number): NoteTagSuggestionDTO {
  return {
    noteId: 'note-1',
    name,
    normalizedName: name,
    score,
    isNew: false,
    sources: ['test'],
  };
}

describe('seleção para atribuição automática', () => {
  it('usa média ponderada e limita a quantidade de tags', () => {
    const selected = selectAutoAssignSuggestions(
      [
        suggestion('typescript', 0.9),
        suggestion('testes', 0.8),
        suggestion('seguranca', 0.2),
        suggestion('ruido', 0.1),
      ],
      0
    );

    expect(selected.map((item) => item.name)).toEqual(['typescript', 'testes']);
    expect(selected.length).toBeLessThanOrEqual(MAX_AUTO_TAGS_PER_NOTE);
  });

  it('respeita o orçamento restante de tags da nota', () => {
    const selected = selectAutoAssignSuggestions(
      [suggestion('a', 0.9), suggestion('b', 0.85), suggestion('c', 0.8)],
      2
    );

    expect(selected).toHaveLength(1);
  });

  it('não atribui nada quando a nota já atingiu o limite', () => {
    expect(
      selectAutoAssignSuggestions([suggestion('typescript', 1)], MAX_AUTO_TAGS_PER_NOTE)
    ).toEqual([]);
  });
});
