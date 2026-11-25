import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { TagSuggestionPipeline } from '@domain/services/tagSuggestions/index.js';
import { TagSuggestionService } from '@application/tagSuggestions/TagSuggestionService.js';
import { LocalTagSuggestionCache } from '@infrastructure/persistence/LocalTagSuggestionCache.js';
import { LocalTagSuggestionDecisions } from '@infrastructure/persistence/LocalTagSuggestionDecisions.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'TypeScript melhora a segurança.',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function suggestionPipeline(): TagSuggestionPipeline {
  return {
    suggest: () => [
      {
        name: 'typescript',
        normalizedName: 'typescript',
        score: 0.9,
        isNew: true,
        sources: ['yake'],
        reason: 'Termo relevante no conteúdo',
      },
    ],
  } as unknown as TagSuggestionPipeline;
}

describe('decisões de sugestões de tags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mantém o descarte após mudança de conteúdo e nova instância', () => {
    const first = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      suggestionPipeline(),
      new LocalTagSuggestionDecisions()
    );
    const input = {
      chainId: 'chain-1',
      notes: [makeNote()],
      availableTags: [],
      chainTags: [],
    };

    first.suggest(input);
    first.dismiss('note-1', 'typescript');
    expect(first.suggest(input).suggestionsByNoteId['note-1']).toEqual([]);

    const second = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      suggestionPipeline(),
      new LocalTagSuggestionDecisions()
    );
    const changed = {
      ...input,
      notes: [makeNote({ content: 'TypeScript mudou de conteúdo.' })],
    };

    expect(second.suggest(changed).suggestionsByNoteId['note-1']).toEqual([]);
  });

  it('remove decisões quando a nota é excluída', () => {
    const service = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      suggestionPipeline(),
      new LocalTagSuggestionDecisions()
    );
    const input = {
      chainId: 'chain-1',
      notes: [makeNote()],
      availableTags: [],
      chainTags: [],
    };

    service.suggest(input);
    service.dismiss('note-1', 'typescript');
    service.removeNote('note-1');

    expect(service.suggest(input).suggestionsByNoteId['note-1']).toHaveLength(1);
  });
});
