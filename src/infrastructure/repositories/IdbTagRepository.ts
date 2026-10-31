import type { IDBPDatabase } from 'idb';
import type { ThreadNotesDB } from '../persistence/schema.js';
import { getDatabase } from '../persistence/schema.js';
import { Tag, ChainTag } from '@domain/entities/index.js';
import type { ITagRepository } from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';

export class IdbTagRepository implements ITagRepository {
  private async db(): Promise<IDBPDatabase<ThreadNotesDB>> {
    return getDatabase();
  }

  async findById(id: UUID): Promise<Tag | null> {
    const db = await this.db();
    const data = await db.get('tags', id);
    return data ? Tag.reconstitute(data) : null;
  }

  async findByNormalizedName(normalized: string): Promise<Tag | null> {
    const db = await this.db();
    const data = await db.getFromIndex('tags', 'by-normalizedName', normalized);
    return data ? Tag.reconstitute(data) : null;
  }

  async findAll(): Promise<Tag[]> {
    const db = await this.db();
    const all = await db.getAll('tags');
    return all.map((d) => Tag.reconstitute(d));
  }

  async findByChainId(chainId: UUID): Promise<Tag[]> {
    const db = await this.db();
    const chainTags = await db.getAllFromIndex('chainTags', 'by-chainId', chainId);
    const tags = await Promise.all(chainTags.map((ct) => db.get('tags', ct.tagId)));
    return tags.filter((t): t is NonNullable<typeof t> => t !== undefined).map((t) => Tag.reconstitute(t));
  }

  async findChainIdsByTag(tagId: UUID): Promise<UUID[]> {
    const db = await this.db();
    const chainTags = await db.getAllFromIndex('chainTags', 'by-tagId', tagId);
    return [...new Set(chainTags.map((chainTag) => chainTag.chainId))];
  }

  async save(tag: Tag): Promise<void> {
    const db = await this.db();
    await db.put('tags', tag.toData());
  }

  async delete(id: UUID): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['tags', 'chainTags'], 'readwrite');
    await tx.objectStore('tags').delete(id);
    // Remove todas as associações
    const chainTags = await tx.objectStore('chainTags').index('by-tagId').getAll(id);
    for (const ct of chainTags) {
      await tx.objectStore('chainTags').delete([ct.chainId, ct.tagId]);
    }
    await tx.done;
  }

  async assignToChain(chainTag: ChainTag): Promise<void> {
    const db = await this.db();
    // Idempotente: usa put para evitar duplicatas
    await db.put('chainTags', chainTag.toData());
  }

  async removeFromChain(chainId: UUID, tagId: UUID): Promise<void> {
    const db = await this.db();
    await db.delete('chainTags', [chainId, tagId]);
  }

  async countChainsForTag(tagId: UUID): Promise<number> {
    const db = await this.db();
    const chainTags = await db.getAllFromIndex('chainTags', 'by-tagId', tagId);
    return chainTags.length;
  }
}
