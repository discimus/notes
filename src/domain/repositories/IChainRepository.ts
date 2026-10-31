import type { UUID } from '../../shared/types/index.js';
import type { Chain } from '../entities/index.js';
import type { Note } from '../entities/index.js';

export type ChainSortOrder = 'createdAt' | 'updatedAt' | 'title';
export type ChainFilter = {
  archived?: boolean;
  deleted?: boolean;
  favorite?: boolean;
  tagIds?: UUID[];
  search?: string;
};

export interface IChainRepository {
  findById(id: UUID): Promise<Chain | null>;
  findAll(filter?: ChainFilter, sort?: ChainSortOrder): Promise<Chain[]>;
  save(chain: Chain, notes: Note[]): Promise<void>;
  saveChainOnly(chain: Chain): Promise<void>;
  saveNote(note: Note): Promise<void>;
  delete(id: UUID): Promise<void>;
  countByTagId(tagId: UUID): Promise<number>;
}

export interface IChainReadModel {
  id: UUID;
  displayTitle: string;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  isFavorite: boolean;
  tagIds: UUID[];
}
