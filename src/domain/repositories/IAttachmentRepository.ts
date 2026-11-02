import type { UUID } from '@shared/types/index.js';
import type { Attachment } from '../entities/index.js';

export interface IAttachmentRepository {
  findByChainId(chainId: UUID): Promise<Attachment[]>;
  findByNoteId(noteId: UUID): Promise<Attachment[]>;
  save(attachment: Attachment, blob: Blob): Promise<void>;
  delete(id: UUID): Promise<void>;
  deleteByChain(chainId: UUID): Promise<void>;
  moveNoteAttachments(noteIds: UUID[], chainId: UUID): Promise<void>;
  getBlob(id: UUID): Promise<Blob | null>;
}
