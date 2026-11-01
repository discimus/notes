import type { IAttachmentRepository } from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';

export class DeleteNoteAttachment {
  constructor(private readonly attachmentRepo: IAttachmentRepository) {}

  async execute(attachmentId: UUID): Promise<void> {
    await this.attachmentRepo.delete(attachmentId);
  }
}
