import type {
  ITagSuggestionDecisions,
  NoteTagDecision,
} from '@application/ports/ITagSuggestionDecisions.js';

export const TAG_SUGGESTION_DECISIONS_KEY =
  'threadnotes.tag-suggestions.decisions.v1';
const MAX_TOTAL = 2000;
const MAX_PER_NOTE = 50;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDecision(value: unknown): value is NoteTagDecision {
  return (
    isRecord(value) &&
    typeof value['noteId'] === 'string' &&
    typeof value['normalizedName'] === 'string' &&
    (value['decision'] === 'accepted' || value['decision'] === 'dismissed') &&
    typeof value['decidedAt'] === 'string'
  );
}

function cloneDecision(decision: NoteTagDecision): NoteTagDecision {
  return { ...decision };
}

export class LocalTagSuggestionDecisions implements ITagSuggestionDecisions {
  private readonly byNote: Map<string, Map<string, NoteTagDecision>>;

  constructor(private readonly target: Storage | null = storage()) {
    this.byNote = this.restore();
  }

  loadForNote(noteId: string): readonly NoteTagDecision[] {
    return [...(this.byNote.get(noteId)?.values() ?? [])].map(cloneDecision);
  }

  record(decision: NoteTagDecision): void {
    const entries = this.byNote.get(decision.noteId) ?? new Map();
    entries.set(decision.normalizedName, cloneDecision(decision));

    if (entries.size > MAX_PER_NOTE) {
      const ordered = [...entries.values()].sort((a, b) =>
        b.decidedAt.localeCompare(a.decidedAt)
      );
      ordered.slice(MAX_PER_NOTE).forEach((entry) => entries.delete(entry.normalizedName));
    }

    this.byNote.set(decision.noteId, entries);
    this.prune();
    this.persist();
  }

  removeForNote(noteId: string): void {
    if (!this.byNote.delete(noteId)) return;
    this.persist();
  }

  private restore(): Map<string, Map<string, NoteTagDecision>> {
    const restored = new Map<string, Map<string, NoteTagDecision>>();
    if (!this.target) return restored;

    try {
      const raw = this.target.getItem(TAG_SUGGESTION_DECISIONS_KEY);
      if (!raw) return restored;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) return restored;

      Object.values(parsed).forEach((value) => {
        if (!Array.isArray(value)) return;
        value.forEach((item) => {
          if (!isDecision(item)) return;
          const entries = restored.get(item.noteId) ?? new Map();
          entries.set(item.normalizedName, cloneDecision(item));
          restored.set(item.noteId, entries);
        });
      });
    } catch {
      return restored;
    }

    return restored;
  }

  private prune(): void {
    let total = 0;
    this.byNote.forEach((entries, noteId) => {
      total += entries.size;
      if (entries.size === 0) this.byNote.delete(noteId);
    });
    if (total <= MAX_TOTAL) return;

    const ordered = [...this.byNote.entries()]
      .flatMap(([noteId, entries]) =>
        [...entries.values()].map((decision) => ({ noteId, decision }))
      )
      .sort((a, b) => b.decision.decidedAt.localeCompare(a.decision.decidedAt));

    ordered.slice(MAX_TOTAL).forEach(({ noteId, decision }) => {
      this.byNote.get(noteId)?.delete(decision.normalizedName);
    });
  }

  private persist(): void {
    if (!this.target) return;
    const payload: Record<string, NoteTagDecision[]> = {};
    this.byNote.forEach((entries, noteId) => {
      payload[noteId] = [...entries.values()].map(cloneDecision);
    });

    try {
      this.target.setItem(TAG_SUGGESTION_DECISIONS_KEY, JSON.stringify(payload));
    } catch {
      return;
    }
  }
}
