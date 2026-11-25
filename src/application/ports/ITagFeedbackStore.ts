import type { ISODateString } from '@shared/types/index.js';

export type TagFeedbackKind = 'accepted' | 'dismissed' | 'manual' | 'autoAssigned';

export interface TagFeedbackRecord {
  normalizedName: string;
  accepted: number;
  dismissed: number;
  manual: number;
  autoAssigned: number;
  lastUsedAt?: ISODateString | undefined;
  updatedAt: ISODateString;
}

export type TagFeedbackMap = Record<string, TagFeedbackRecord>;

export interface ITagFeedbackStore {
  load(): TagFeedbackMap;
  record(kind: TagFeedbackKind, normalizedName: string): void;
}
