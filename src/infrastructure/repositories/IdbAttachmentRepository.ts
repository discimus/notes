import type { IDBPDatabase } from 'idb';
import type { ThreadNotesDB } from '../persistence/schema.js';
import { getDatabase } from '../persistence/schema.js';
import { Attachment } from '@domain/entities/index.js';
import type { IAttachmentRepository } from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';

function sortAttachments(attachments: Attachment[]): Attachment[] {
  return attachments.sort((a, b) => {
    const byDate = a.createdAt.localeCompare(b.createdAt);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}

export class IdbAttachmentRepository implements IAttachmentRepository {
  private async db(): Promise<IDBPDatabase<ThreadNotesDB>> {
    return getDatabase();
  }

  async findByChainId(chainId: UUID): Promise<Attachment[]> {
    const db = await this.db();
    const records = await db.getAllFromIndex('attachments', 'by-chainId', chainId);
    return sortAttachments(records.map((record) => Attachment.reconstitute(record)));
  }

  async findByNoteId(noteId: UUID): Promise<Attachment[]> {
    const db = await this.db();
    const records = await db.getAllFromIndex('attachments', 'by-noteId', noteId);
    return sortAttachments(records.map((record) => Attachment.reconstitute(record)));
  }

  async save(attachment: Attachment, blob: Blob): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['attachments', 'attachmentBlobs'], 'readwrite');
    const metadataWrite = tx.objectStore('attachments').put(attachment.toData());
    const blobWrite = tx
      .objectStore('attachmentBlobs')
      .put({ id: attachment.id, blob });
    await Promise.all([metadataWrite, blobWrite, tx.done]);
  }

  async delete(id: UUID): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['attachments', 'attachmentBlobs'], 'readwrite');
    await tx.objectStore('attachments').delete(id);
    await tx.objectStore('attachmentBlobs').delete(id);
    await tx.done;
  }

  async deleteByChain(chainId: UUID): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['attachments', 'attachmentBlobs'], 'readwrite');
    const keys = await tx.objectStore('attachments').index('by-chainId').getAllKeys(chainId);
    for (const key of keys) {
      await tx.objectStore('attachments').delete(key);
      await tx.objectStore('attachmentBlobs').delete(key);
    }
    await tx.done;
  }

  async getBlob(id: UUID): Promise<Blob | null> {
    const db = await this.db();
    const record = await db.get('attachmentBlobs', id);
    return record?.blob ?? null;
  }
}
