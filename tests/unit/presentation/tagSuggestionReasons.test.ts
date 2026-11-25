import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteTagSuggestionDTO } from '@application/dto/index.js';
import { mountInlineTagEditor } from '@presentation/components/InlineTagEditor.js';

function suggestion(
  overrides: Partial<NoteTagSuggestionDTO> = {}
): NoteTagSuggestionDTO {
  return {
    noteId: 'note-1',
    name: 'Programação',
    normalizedName: 'programacao',
    score: 0.9,
    isNew: true,
    isStandard: true,
    sources: ['catalog', 'yake'],
    reason: 'Relacionada a Programação',
    ...overrides,
  };
}

describe('motivo das sugestões de tags', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('expõe o motivo no title e no aria-description do chip', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const editor = mountInlineTagEditor(host, {
      onAdd: vi.fn(() => Promise.resolve(true)),
      onRemove: vi.fn(),
      onAcceptSuggestion: vi.fn(() => Promise.resolve(true)),
      onDismissSuggestion: vi.fn(),
    });

    editor.update([], [], [suggestion()]);

    const chip = host.querySelector<HTMLElement>('.chip--suggestion');
    expect(chip?.title).toContain('Relacionada a Programação');
    expect(chip?.getAttribute('aria-description')).toBe(
      'Relacionada a Programação'
    );
    expect(chip?.classList.contains('chip--suggestion-standard')).toBe(true);
    editor.destroy();
  });
});
