import type { IAttachmentRepository } from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';

export class GetAttachmentBlob {
  constructor(private readonly attachmentRepo: IAttachmentRepository) {}

  async execute(attachmentId: UUID): Promise<Blob | null> {
    return this.attachmentRepo.getBlob(attachmentId);
  }
}
