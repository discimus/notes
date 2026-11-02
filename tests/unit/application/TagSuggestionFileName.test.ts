import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { TagSuggestionPipeline } from '@domain/services/tagSuggestions/index.js';
import { TagSuggestionService } from '@application/tagSuggestions/TagSuggestionService.js';
import { LocalTagSuggestionCache } from '@infrastructure/persistence/LocalTagSuggestionCache.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'conteudo comum',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function createPipeline() {
  return {
    suggest: vi.fn(() => []),
  } as unknown as TagSuggestionPipeline & {
    suggest: ReturnType<typeof vi.fn>;
  };
}

describe('TagSuggestionService — nome do arquivo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('envia o nome do arquivo para o pipeline', () => {
    const pipeline = createPipeline();
    const service = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      pipeline
    );

    service.suggest({
      chainId: 'chain-1',
      notes: [makeNote({ sourceFileName: 'typescript.md' })],
      availableTags: [],
      chainTags: [],
    });

    expect(pipeline.suggest).toHaveBeenCalledWith(
      expect.objectContaining({ sourceFileName: 'typescript.md' })
    );
  });

  it('regenera sugestões quando apenas o nome do arquivo muda', () => {
    const pipeline = createPipeline();
    const service = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      pipeline
    );
    const base = {
      chainId: 'chain-1',
      availableTags: [],
      chainTags: [],
    };

    const first = service.suggest({
      ...base,
      notes: [makeNote({ sourceFileName: 'a.txt' })],
    });
    const second = service.suggest({
      ...base,
      notes: [makeNote({ sourceFileName: 'a.txt' })],
    });
    const third = service.suggest({
      ...base,
      notes: [makeNote({ sourceFileName: 'b.txt' })],
    });

    expect(first.generatedNoteIds).toEqual(['note-1']);
    expect(second.generatedNoteIds).toEqual([]);
    expect(third.generatedNoteIds).toEqual(['note-1']);
    expect(pipeline.suggest).toHaveBeenCalledTimes(2);
  });
});
