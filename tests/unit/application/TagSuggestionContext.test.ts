import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { TagSuggestionPipeline } from '@domain/services/tagSuggestions/index.js';
import { TagSuggestionService } from '@application/tagSuggestions/TagSuggestionService.js';
import { LocalTagSuggestionCache } from '@infrastructure/persistence/LocalTagSuggestionCache.js';
import { MemoryTagSuggestionDecisions } from '@application/tagSuggestions/decisions.js';

function makeNote(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: 'note-1',
    content: 'TypeScript e arquitetura.',
    chainId: 'chain-1',
    position: 1,
    role: 'tail',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('contexto do serviço de sugestões', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hidrata o corpus com notas irmãs mesmo processando só a nota alvo', () => {
    const pipeline = {
      suggest: vi.fn(() => []),
    } as unknown as TagSuggestionPipeline;
    const service = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      pipeline,
      new MemoryTagSuggestionDecisions()
    );

    service.suggest({
      chainId: 'chain-1',
      chainTitle: 'Projeto TypeScript',
      notes: [
        makeNote({ id: 'note-1', tags: [] }),
        makeNote({
          id: 'note-2',
          content: '# Arquitetura\n\nDetalhes de DDD.',
          tags: [],
        }),
      ],
      availableTags: [],
      chainTags: [],
      noteIds: ['note-2'],
    });

    expect(pipeline.suggest).toHaveBeenCalledTimes(1);
    const input = (pipeline.suggest as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0]?.[0] as {
      title?: string;
      chainTitle?: string;
      corpus: unknown[];
    };
    expect(input.title).toBe('Arquitetura');
    expect(input.chainTitle).toBe('Projeto TypeScript');
    expect(input.corpus).toHaveLength(1);
  });

  it('não recalcula quando a assinatura de contexto permanece igual', () => {
    const pipeline = {
      suggest: vi.fn(() => []),
    } as unknown as TagSuggestionPipeline;
    const service = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      pipeline,
      new MemoryTagSuggestionDecisions()
    );
    const input = {
      chainId: 'chain-1',
      notes: [makeNote()],
      availableTags: [],
      chainTags: [],
    };

    service.suggest(input);
    service.suggest(input);

    expect(pipeline.suggest).toHaveBeenCalledTimes(1);
  });
});
