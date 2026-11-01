import type { UUID, ISODateString } from '@shared/types/index.js';
import type { AttachmentKind, NoteContentType, NoteRole } from '@domain/entities/index.js';
import type { TagOrigin } from '@domain/entities/index.js';
export type { NoteContentType } from '@domain/entities/index.js';
export type { AttachmentKind } from '@domain/entities/index.js';

export interface AttachmentDTO {
  id: UUID;
  noteId: UUID;
  chainId: UUID;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  byteSize: number;
  altText?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  duration?: number | undefined;
  createdAt: ISODateString;
}

// ── Note DTOs ──────────────────────────────────────────────────────────────

export interface NoteDTO {
  id: UUID;
  content: string;
  chainId: UUID;
  position: number;
  role: NoteRole;
  contentType?: NoteContentType | undefined;
  title?: string | undefined;
  attachments?: AttachmentDTO[] | undefined;
  tags?: TagDTO[] | undefined;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AddNoteAttachmentCommand {
  chainId: UUID;
  noteId?: UUID | undefined;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  blob: Blob;
  altText?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  duration?: number | undefined;
}

// ── Chain DTOs ─────────────────────────────────────────────────────────────

export interface ChainSummaryDTO {
  id: UUID;
  displayTitle: string;
  noteCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archivedAt?: ISODateString | undefined;
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

export interface TimelinePageDTO {
  entries: TimelineEntryDTO[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
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
  contentType?: NoteContentType | undefined;
  title?: string | undefined;
  tagNames?: string[] | undefined;
}

export interface CreateChainTitleCommand {
  title: string;
}

export interface CreateChainWithNoteCommand {
  title: string;
  content: string;
  contentType?: NoteContentType | undefined;
}

export interface CreateChainWithNoteResult {
  chain: ChainDetailDTO;
  note: NoteDTO;
}

export interface AppendNoteCommand {
  chainId: UUID;
  content: string;
  contentType?: NoteContentType | undefined;
}

export interface UpdateNoteCommand {
  noteId: UUID;
  chainId: UUID;
  content: string;
  contentType?: NoteContentType | undefined;
}

export interface ImportTextNoteCommand {
  chainId: UUID;
  content: string;
  sourceCreatedAt?: ISODateString | undefined;
}

export interface ImportTextDocumentInput {
  content: string;
  sourceCreatedAt?: ISODateString | undefined;
}

export interface ImportTextNotesCommand {
  chainId: UUID;
  documents: ImportTextDocumentInput[];
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

export interface AssignNoteTagCommand {
  chainId: UUID;
  noteId: UUID;
  tagName: string;
}

export interface RemoveNoteTagCommand {
  chainId: UUID;
  noteId: UUID;
  tagId: UUID;
}

export interface GetTimelineCommand {
  chainIds: UUID[];
  from?: ISODateString | undefined;
  to?: ISODateString | undefined;
}

export interface GetTimelinePageCommand {
  chainIds: UUID[];
  from?: ISODateString | undefined;
  to?: ISODateString | undefined;
  text?: string | undefined;
  tagIds?: UUID[] | undefined;
  tagMode?: 'any' | 'all' | undefined;
  contentTypes?: NoteContentType[] | undefined;
  sort?: 'newest' | 'oldest' | undefined;
  offset: number;
  limit: number;
}

export interface SearchCommand {
  query: string;
}
