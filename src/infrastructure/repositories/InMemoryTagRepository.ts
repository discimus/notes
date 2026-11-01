import { Tag, ChainTag, NoteTag } from '@domain/entities/index.js';
import type { ITagRepository } from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';

export class InMemoryTagRepository implements ITagRepository {
  private tags = new Map<string, Tag>();
  private chainTags: ChainTag[] = [];
  private noteTags: NoteTag[] = [];

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

  async findByNoteId(noteId: UUID): Promise<Tag[]> {
    return this.tagsForNote(noteId);
  }

  async findByNoteIds(noteIds: UUID[]): Promise<Map<UUID, Tag[]>> {
    return new Map(noteIds.map((noteId) => [noteId, this.tagsForNote(noteId)]));
  }

  async findChainIdsByTag(tagId: UUID): Promise<UUID[]> {
    return [
      ...new Set(
        this.chainTags
          .filter((chainTag) => chainTag.tagId === tagId)
          .map((chainTag) => chainTag.chainId)
      ),
    ];
  }

  async findNoteIdsByTag(tagId: UUID): Promise<UUID[]> {
    return [
      ...new Set(
        this.noteTags
          .filter((noteTag) => noteTag.tagId === tagId)
          .map((noteTag) => noteTag.noteId)
      ),
    ];
  }

  async save(tag: Tag): Promise<void> {
    this.tags.set(tag.id, tag);
  }

  async delete(id: UUID): Promise<void> {
    this.tags.delete(id);
    this.chainTags = this.chainTags.filter((ct) => ct.tagId !== id);
    this.noteTags = this.noteTags.filter((nt) => nt.tagId !== id);
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

  async assignToNote(noteTag: NoteTag): Promise<void> {
    const exists = this.noteTags.some(
      (nt) => nt.noteId === noteTag.noteId && nt.tagId === noteTag.tagId
    );
    if (!exists) this.noteTags.push(noteTag);
  }

  async removeFromNote(noteId: UUID, tagId: UUID): Promise<void> {
    this.noteTags = this.noteTags.filter(
      (nt) => !(nt.noteId === noteId && nt.tagId === tagId)
    );
  }

  async countChainsForTag(tagId: UUID): Promise<number> {
    const chainIds = new Set(
      this.chainTags.filter((ct) => ct.tagId === tagId).map((ct) => ct.chainId)
    );
    this.noteTags
      .filter((nt) => nt.tagId === tagId)
      .forEach((nt) => chainIds.add(nt.chainId));
    return chainIds.size;
  }

  private tagsForNote(noteId: UUID): Tag[] {
    return this.noteTags
      .filter((noteTag) => noteTag.noteId === noteId)
      .map((noteTag) => this.tags.get(noteTag.tagId))
      .filter((tag): tag is Tag => tag !== undefined);
  }

  clear(): void {
    this.tags.clear();
    this.chainTags = [];
    this.noteTags = [];
  }
}
