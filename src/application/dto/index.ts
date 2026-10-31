import type { UUID, ISODateString } from '../../shared/types/index.js';
import type { NoteRole } from '../../domain/entities/index.js';
import type { TagOrigin } from '../../domain/entities/index.js';

// ── Note DTOs ──────────────────────────────────────────────────────────────

export interface NoteDTO {
  id: UUID;
  content: string;
  chainId: UUID;
  position: number;
  role: NoteRole;
  title?: string | undefined;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ── Chain DTOs ─────────────────────────────────────────────────────────────

export interface ChainSummaryDTO {
  id: UUID;
  displayTitle: string;
  noteCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archivedAt?: ISODateString | undefined;
  isFavorite: boolean;
  tagIds: UUID[];
  tags: TagDTO[];
  headerExcerpt: string;
}

export interface ChainDetailDTO extends ChainSummaryDTO {
  notes: NoteDTO[];
}

// ── Tag DTOs ───────────────────────────────────────────────────────────────

export interface TagDTO {
  id: UUID;
  name: string;
  normalizedName: string;
  createdAt: ISODateString;
  origin: TagOrigin;
  chainCount: number;
}

// ── Timeline DTOs ──────────────────────────────────────────────────────────

export interface TimelineEntryDTO {
  note: NoteDTO;
  chainId: UUID;
  chainTitle: string;
}

export interface TimelineDTO {
  entries: TimelineEntryDTO[];
  filter: {
    chainIds: UUID[];
    from?: ISODateString | undefined;
    to?: ISODateString | undefined;
  };
  createdAt: ISODateString;
}

// ── Search DTOs ────────────────────────────────────────────────────────────

export interface SearchResultDTO {
  noteId: UUID;
  chainId: UUID;
  chainTitle: string;
  snippet: string;
  noteCreatedAt: ISODateString;
  noteRole: string;
  matchType: string;
}

// ── Input Commands ─────────────────────────────────────────────────────────

export interface CreateChainCommand {
  content: string;
  title?: string | undefined;
  tagNames?: string[] | undefined;
}

export interface AppendNoteCommand {
  chainId: UUID;
  content: string;
}

export interface UpdateNoteCommand {
  noteId: UUID;
  chainId: UUID;
  content: string;
}

export interface UpdateChainTitleCommand {
  chainId: UUID;
  title?: string | undefined;
}

export interface AssignTagCommand {
  chainId: UUID;
  tagName: string;
}

export interface RemoveTagCommand {
  chainId: UUID;
  tagId: UUID;
}

export interface GetTimelineCommand {
  chainIds: UUID[];
  from?: ISODateString | undefined;
  to?: ISODateString | undefined;
}

export interface SearchCommand {
  query: string;
}
