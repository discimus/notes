import { Tag, ChainTag } from '../../domain/entities/index.js';
import type { ITagRepository } from '../../domain/repositories/index.js';
import type { UUID } from '../../shared/types/index.js';

export class InMemoryTagRepository implements ITagRepository {
  private tags = new Map<string, Tag>();
  private chainTags: ChainTag[] = [];

  async findById(id: UUID): Promise<Tag | null> {
    return this.tags.get(id) ?? null;
  }

  async findByNormalizedName(normalized: string): Promise<Tag | null> {
    for (const tag of this.tags.values()) {
      if (tag.name.normalized === normalized) return tag;
    }
    return null;
  }

  async findAll(): Promise<Tag[]> {
    return [...this.tags.values()];
  }

  async findByChainId(chainId: UUID): Promise<Tag[]> {
    const tagIds = this.chainTags.filter((ct) => ct.chainId === chainId).map((ct) => ct.tagId);
    return tagIds.map((id) => this.tags.get(id)).filter((t): t is Tag => t !== undefined);
  }

  async save(tag: Tag): Promise<void> {
    this.tags.set(tag.id, tag);
  }

  async delete(id: UUID): Promise<void> {
    this.tags.delete(id);
    this.chainTags = this.chainTags.filter((ct) => ct.tagId !== id);
  }

  async assignToChain(chainTag: ChainTag): Promise<void> {
    const exists = this.chainTags.some(
      (ct) => ct.chainId === chainTag.chainId && ct.tagId === chainTag.tagId
    );
    if (!exists) this.chainTags.push(chainTag);
  }

  async removeFromChain(chainId: UUID, tagId: UUID): Promise<void> {
    this.chainTags = this.chainTags.filter(
      (ct) => !(ct.chainId === chainId && ct.tagId === tagId)
    );
  }

  async countChainsForTag(tagId: UUID): Promise<number> {
    return this.chainTags.filter((ct) => ct.tagId === tagId).length;
  }

  clear(): void {
    this.tags.clear();
    this.chainTags = [];
  }
}
