import type { UUID, ISODateString } from '@shared/types/index.js';
import type { TimelineEntry } from '../entities/index.js';

export interface TimelinePageQuery {
  chainIds: UUID[];
  from?: ISODateString | undefined;
  to?: ISODateString | undefined;
  text?: string | undefined;
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
