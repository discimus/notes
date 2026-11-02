import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO, TagDTO } from '@application/dto/index.js';
import type { TagSuggestionPipeline } from '@domain/services/tagSuggestions/index.js';
import { TagSuggestionService } from '@application/tagSuggestions/TagSuggestionService.js';
import { LocalTagSuggestionCache } from '@infrastructure/persistence/LocalTagSuggestionCache.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'TypeScript melhora a segurança dos testes.',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeTag(overrides: Partial<TagDTO> = {}): TagDTO {
  return {
    id: 'tag-1',
    name: 'typescript',
    normalizedName: 'typescript',
    createdAt: '2026-01-01T10:00:00.000Z',
    origin: 'manual',
    chainCount: 1,
    ...overrides,
  };
}

function fakePipeline(): TagSuggestionPipeline {
  return {
    suggest: vi.fn(() => [
      {
        name: 'typescript',
        normalizedName: 'typescript',
        score: 0.92,
        isNew: false,
        existingTagId: 'tag-1',
        sources: ['yake', 'tfidf'],
      },
    ]),
  } as unknown as TagSuggestionPipeline;
}

describe('TagSuggestionService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gera sugestões e reutiliza o cache quando o conteúdo não mudou', () => {
    const pipeline = fakePipeline();
    const service = new TagSuggestionService(new LocalTagSuggestionCache(), pipeline);
    const note = makeNote();
    const input = {
      chainId: 'chain-1',
      notes: [note],
      availableTags: [makeTag()],
      chainTags: [],
    };

    const first = service.suggest(input);
    const second = service.suggest(input);

    expect(first.generatedNoteIds).toEqual(['note-1']);
    expect(first.suggestionsByNoteId['note-1']?.[0]).toMatchObject({
      name: 'typescript',
      existingTagId: 'tag-1',
      isNew: false,
    });
    expect(second.generatedNoteIds).toEqual([]);
    expect(pipeline.suggest).toHaveBeenCalledTimes(1);
  });

  it('descarta e aceita sugestões sem alterar as demais', () => {
    const service = new TagSuggestionService(new LocalTagSuggestionCache(), fakePipeline());
    const input = {
      chainId: 'chain-1',
      notes: [makeNote()],
      availableTags: [makeTag()],
      chainTags: [],
    };

    service.suggest(input);
    service.dismiss('note-1', 'typescript');
    expect(service.suggest(input).suggestionsByNoteId['note-1']).toEqual([]);

    localStorage.clear();
    const acceptedService = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      fakePipeline()
    );
    acceptedService.suggest(input);
    acceptedService.markAccepted('note-1', 'typescript');
    expect(acceptedService.suggest(input).suggestionsByNoteId['note-1']).toEqual([]);
  });

  it('persiste o cache entre instâncias', () => {
    const input = {
      chainId: 'chain-1',
      notes: [makeNote()],
      availableTags: [makeTag()],
      chainTags: [],
    };
    new TagSuggestionService(new LocalTagSuggestionCache(), fakePipeline()).suggest(input);

    const nextPipeline = fakePipeline();
    const restored = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      nextPipeline
    );
    const result = restored.suggest(input);

    expect(result.suggestionsByNoteId['note-1']).toHaveLength(1);
    expect(nextPipeline.suggest).not.toHaveBeenCalled();
  });
});
