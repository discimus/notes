import type { UUID } from '@shared/types/index.js';
import type { Tag } from '../entities/index.js';
import type { ChainTag } from '../entities/index.js';
import type { NoteTag } from '../entities/index.js';

export interface ITagRepository {
  findById(id: UUID): Promise<Tag | null>;
  findByNormalizedName(normalized: string): Promise<Tag | null>;
  findAll(): Promise<Tag[]>;
  findByChainId(chainId: UUID): Promise<Tag[]>;
  findByNoteId(noteId: UUID): Promise<Tag[]>;
  findByNoteIds(noteIds: UUID[]): Promise<Map<UUID, Tag[]>>;
  findChainIdsByTag(tagId: UUID): Promise<UUID[]>;
  findNoteIdsByTag(tagId: UUID): Promise<UUID[]>;
  save(tag: Tag): Promise<void>;
  delete(id: UUID): Promise<void>;
  assignToChain(chainTag: ChainTag): Promise<void>;
  removeFromChain(chainId: UUID, tagId: UUID): Promise<void>;
  assignToNote(noteTag: NoteTag): Promise<void>;
  removeFromNote(noteId: UUID, tagId: UUID): Promise<void>;
  moveNoteTags(noteIds: UUID[], chainId: UUID): Promise<void>;
  countChainsForTag(tagId: UUID): Promise<number>;
}
