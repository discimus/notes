import type { UUID, ISODateString } from '@shared/types/index.js';
import type { NoteContentType, TimelineEntry } from '../entities/index.js';

export interface TimelineTagGroup {
  chainIds: UUID[];
  noteIds: UUID[];
}

export interface TimelinePageQuery {
  chainIds: UUID[];
  from?: ISODateString | undefined;
  to?: ISODateString | undefined;
  text?: string | undefined;
  tagFilters?: TimelineTagGroup[] | undefined;
  tagMode?: 'any' | 'all' | undefined;
  contentTypes?: NoteContentType[] | undefined;
  sort?: 'newest' | 'oldest' | undefined;
  offset: number;
  limit: number;
}

export interface TimelinePageResult {
  entries: TimelineEntry[];
  total: number;
}

export interface ITimelineQueryRepository {
  findTimelinePage(query: TimelinePageQuery): Promise<TimelinePageResult>;
}
