import type { UUID } from '@shared/types/index.js';
import type { Tag } from '../entities/index.js';
import type { ChainTag } from '../entities/index.js';

export interface ITagRepository {
  findById(id: UUID): Promise<Tag | null>;
  findByNormalizedName(normalized: string): Promise<Tag | null>;
  findAll(): Promise<Tag[]>;
  findByChainId(chainId: UUID): Promise<Tag[]>;
  save(tag: Tag): Promise<void>;
  delete(id: UUID): Promise<void>;
  assignToChain(chainTag: ChainTag): Promise<void>;
  removeFromChain(chainId: UUID, tagId: UUID): Promise<void>;
  countChainsForTag(tagId: UUID): Promise<number>;
}
