import { Attachment } from '@domain/entities/index.js';
import type { IAttachmentRepository } from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';

export class InMemoryAttachmentRepository implements IAttachmentRepository {
  private readonly attachments = new Map<string, Attachment>();
  private readonly blobs = new Map<string, Blob>();

  async findByChainId(chainId: UUID): Promise<Attachment[]> {
    return [...this.attachments.values()]
      .filter((attachment) => attachment.chainId === chainId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findByNoteId(noteId: UUID): Promise<Attachment[]> {
    return [...this.attachments.values()]
      .filter((attachment) => attachment.noteId === noteId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async save(attachment: Attachment, blob: Blob): Promise<void> {
    this.attachments.set(attachment.id, Attachment.reconstitute(attachment.toData()));
    this.blobs.set(attachment.id, blob);
  }

  async delete(id: UUID): Promise<void> {
    this.attachments.delete(id);
    this.blobs.delete(id);
  }

  async deleteByChain(chainId: UUID): Promise<void> {
    for (const [id, attachment] of [...this.attachments.entries()]) {
      if (attachment.chainId !== chainId) continue;
      this.attachments.delete(id);
      this.blobs.delete(id);
    }
  }

  async moveNoteAttachments(noteIds: UUID[], chainId: UUID): Promise<void> {
    const ids = new Set(noteIds);
    for (const [id, attachment] of this.attachments.entries()) {
      if (!ids.has(attachment.noteId)) continue;
      this.attachments.set(
        id,
        Attachment.reconstitute({ ...attachment.toData(), chainId })
      );
    }
  }

  async getBlob(id: UUID): Promise<Blob | null> {
    return this.blobs.get(id) ?? null;
  }

  clear(): void {
    this.attachments.clear();
    this.blobs.clear();
  }
}
