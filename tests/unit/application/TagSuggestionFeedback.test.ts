import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import type { TagSuggestionPipeline } from '@domain/services/tagSuggestions/index.js';
import { TagSuggestionService } from '@application/tagSuggestions/TagSuggestionService.js';
import { LocalTagSuggestionCache } from '@infrastructure/persistence/LocalTagSuggestionCache.js';
import { LocalTagSuggestionDecisions } from '@infrastructure/persistence/LocalTagSuggestionDecisions.js';
import { LocalTagFeedbackStore } from '@infrastructure/persistence/LocalTagFeedbackStore.js';

const note: NoteDTO = {
  id: 'note-1',
  content: 'Conteúdo',
  chainId: 'chain-1',
  position: 1,
  role: 'tail',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function emptyPipeline(): TagSuggestionPipeline {
  return { suggest: () => [] } as unknown as TagSuggestionPipeline;
}

describe('feedback de tags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registra aceite, descarte, criação manual e auto-atribuição', () => {
    const feedback = new LocalTagFeedbackStore();
    const service = new TagSuggestionService(
      new LocalTagSuggestionCache(),
      emptyPipeline(),
      new LocalTagSuggestionDecisions(),
      feedback
    );

    service.suggest({
      chainId: 'chain-1',
      notes: [note],
      availableTags: [],
      chainTags: [],
    });
    service.markAccepted('note-1', 'programacao');
    service.markAccepted('note-1', 'programacao');
    service.dismiss('note-1', 'financa');
    service.markManual('Programação');
    service.markAutoAssigned('note-1', 'tecnologia');

    const records = feedback.load();
    expect(records['programacao']?.accepted).toBe(2);
    expect(records['programacao']?.manual).toBe(1);
    expect(records['financa']?.dismissed).toBe(1);
    expect(records['tecnologia']?.autoAssigned).toBe(1);
  });
});
