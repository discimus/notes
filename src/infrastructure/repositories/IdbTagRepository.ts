import type { IDBPDatabase } from 'idb';
import type { ThreadNotesDB } from '../persistence/schema.js';
import { getDatabase } from '../persistence/schema.js';
import { Tag, ChainTag, NoteTag } from '@domain/entities/index.js';
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

  async findByNoteId(noteId: UUID): Promise<Tag[]> {
    const byNote = await this.findByNoteIds([noteId]);
    return byNote.get(noteId) ?? [];
  }

  async findByNoteIds(noteIds: UUID[]): Promise<Map<UUID, Tag[]>> {
    const db = await this.db();
    const result = new Map<UUID, Tag[]>();

    await Promise.all(
      noteIds.map(async (noteId) => {
        const noteTags = await db.getAllFromIndex('noteTags', 'by-noteId', noteId);
        const tags = await Promise.all(
          noteTags.map((noteTag) => db.get('tags', noteTag.tagId))
        );
        result.set(
          noteId,
          tags
            .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined)
            .map((tag) => Tag.reconstitute(tag))
        );
      })
    );

    return result;
  }

  async findChainIdsByTag(tagId: UUID): Promise<UUID[]> {
    const db = await this.db();
    const chainTags = await db.getAllFromIndex('chainTags', 'by-tagId', tagId);
    return [...new Set(chainTags.map((chainTag) => chainTag.chainId))];
  }

  async findNoteIdsByTag(tagId: UUID): Promise<UUID[]> {
    const db = await this.db();
    const noteTags = await db.getAllFromIndex('noteTags', 'by-tagId', tagId);
    return [...new Set(noteTags.map((noteTag) => noteTag.noteId))];
  }

  async save(tag: Tag): Promise<void> {
    const db = await this.db();
    await db.put('tags', tag.toData());
  }

  async delete(id: UUID): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['tags', 'chainTags', 'noteTags'], 'readwrite');
    await tx.objectStore('tags').delete(id);
    const chainTags = await tx.objectStore('chainTags').index('by-tagId').getAll(id);
    for (const ct of chainTags) {
      await tx.objectStore('chainTags').delete([ct.chainId, ct.tagId]);
    }
    const noteTags = await tx.objectStore('noteTags').index('by-tagId').getAll(id);
    for (const nt of noteTags) {
      await tx.objectStore('noteTags').delete([nt.noteId, nt.tagId]);
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

  async assignToNote(noteTag: NoteTag): Promise<void> {
    const db = await this.db();
    await db.put('noteTags', noteTag.toData());
  }

  async removeFromNote(noteId: UUID, tagId: UUID): Promise<void> {
    const db = await this.db();
    await db.delete('noteTags', [noteId, tagId]);
  }

  async countChainsForTag(tagId: UUID): Promise<number> {
    const db = await this.db();
    const chainIds = new Set<string>();
    const chainTags = await db.getAllFromIndex('chainTags', 'by-tagId', tagId);
    chainTags.forEach((chainTag) => chainIds.add(chainTag.chainId));
    const noteTags = await db.getAllFromIndex('noteTags', 'by-tagId', tagId);
    noteTags.forEach((noteTag) => chainIds.add(noteTag.chainId));
    return chainIds.size;
  }
}
