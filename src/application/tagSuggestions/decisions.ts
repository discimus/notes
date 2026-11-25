import type {
  ITagSuggestionDecisions,
  NoteTagDecision,
} from '../ports/ITagSuggestionDecisions.js';

export class MemoryTagSuggestionDecisions implements ITagSuggestionDecisions {
  private readonly decisions = new Map<string, Map<string, NoteTagDecision>>();

  loadForNote(noteId: string): readonly NoteTagDecision[] {
    return [...(this.decisions.get(noteId)?.values() ?? [])];
  }

  record(decision: NoteTagDecision): void {
    const entries = this.decisions.get(decision.noteId) ?? new Map();
    entries.set(decision.normalizedName, decision);
    this.decisions.set(decision.noteId, entries);
  }

  removeForNote(noteId: string): void {
    this.decisions.delete(noteId);
  }
}
