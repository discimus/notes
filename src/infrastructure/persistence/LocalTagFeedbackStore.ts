import type {
  ITagFeedbackStore,
  TagFeedbackKind,
  TagFeedbackMap,
  TagFeedbackRecord,
} from '@application/ports/ITagFeedbackStore.js';
import { canonicalTagKey } from '@domain/services/tagSuggestions/index.js';
import { now } from '@shared/utilities/index.js';

export const TAG_FEEDBACK_KEY = 'threadnotes.tag-feedback.v1';
const MAX_RECORDS = 1000;

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

function isStoredFeedback(value: unknown): value is TagFeedbackRecord {
  return (
    isRecord(value) &&
    typeof value['normalizedName'] === 'string' &&
    typeof value['accepted'] === 'number' &&
    typeof value['dismissed'] === 'number' &&
    typeof value['manual'] === 'number' &&
    typeof value['autoAssigned'] === 'number' &&
    typeof value['updatedAt'] === 'string' &&
    (value['lastUsedAt'] === undefined || typeof value['lastUsedAt'] === 'string')
  );
}

function cloneRecord(record: TagFeedbackRecord): TagFeedbackRecord {
  return { ...record };
}

export class LocalTagFeedbackStore implements ITagFeedbackStore {
  private records: Map<string, TagFeedbackRecord>;

  constructor(private readonly target: Storage | null = storage()) {
    this.records = this.restore();
  }

  load(): TagFeedbackMap {
    return Object.fromEntries(
      [...this.records.entries()].map(([key, record]) => [
        key,
        cloneRecord(record),
      ])
    );
  }

  record(kind: TagFeedbackKind, normalizedName: string): void {
    const key = canonicalTagKey(normalizedName);
    if (!key) return;

    const current = this.records.get(key) ?? {
      normalizedName: key,
      accepted: 0,
      dismissed: 0,
      manual: 0,
      autoAssigned: 0,
      updatedAt: now(),
    };
    const updatedAt = now();
    const next: TagFeedbackRecord = {
      ...current,
      [kind]: current[kind] + 1,
      updatedAt,
      ...(kind === 'dismissed' ? {} : { lastUsedAt: updatedAt }),
    };

    this.records.set(key, next);
    this.prune();
    this.persist();
  }

  private restore(): Map<string, TagFeedbackRecord> {
    const restored = new Map<string, TagFeedbackRecord>();
    if (!this.target) return restored;

    try {
      const raw = this.target.getItem(TAG_FEEDBACK_KEY);
      if (!raw) return restored;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) return restored;

      Object.values(parsed).forEach((value) => {
        if (!isStoredFeedback(value)) return;
        restored.set(value.normalizedName, cloneRecord(value));
      });
    } catch {
      return restored;
    }

    return restored;
  }

  private prune(): void {
    if (this.records.size <= MAX_RECORDS) return;
    const ordered = [...this.records.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    ordered.slice(MAX_RECORDS).forEach((record) => {
      this.records.delete(record.normalizedName);
    });
  }

  private persist(): void {
    if (!this.target) return;
    try {
      this.target.setItem(
        TAG_FEEDBACK_KEY,
        JSON.stringify(this.load())
      );
    } catch {
      return;
    }
  }
}
