import type { ISODateString, UUID } from '@shared/types/index.js';

export type TagSuggestionDecisionKind = 'accepted' | 'dismissed';

export interface NoteTagDecision {
  noteId: UUID;
  normalizedName: string;
  decision: TagSuggestionDecisionKind;
  decidedAt: ISODateString;
}

export interface ITagSuggestionDecisions {
  loadForNote(noteId: UUID): readonly NoteTagDecision[];
  record(decision: NoteTagDecision): void;
  removeForNote(noteId: UUID): void;
}
