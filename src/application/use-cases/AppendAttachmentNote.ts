import type {
  IAttachmentRepository,
  IChainRepository,
} from '@domain/repositories/index.js';
import type {
  AppendAttachmentNoteCommand,
  AppendAttachmentNoteResult,
} from '../dto/index.js';
import {
  InvariantViolationError,
  NotFoundError,
} from '@shared/types/index.js';
import { Attachment } from '@domain/entities/index.js';
import { mapAttachmentToDTO, mapNoteToDTO } from '../mappers/index.js';

export class AppendAttachmentNote {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly attachmentRepo: IAttachmentRepository
  ) {}

  async execute(
    command: AppendAttachmentNoteCommand
  ): Promise<AppendAttachmentNoteResult> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);
    if (chain.isDeleted()) {
      throw new InvariantViolationError(
        'Não é possível anexar mídia a uma coleção excluída.'
      );
    }
    if (chain.isArchived()) {
      throw new InvariantViolationError(
        'Não é possível anexar mídia a uma coleção arquivada.'
      );
    }

    const note = chain.appendAttachmentNote();
    const common = {
      noteId: note.id,
      chainId: chain.id,
      fileName: command.fileName,
      mimeType: command.mimeType,
      byteSize: command.blob.size,
    };

    const attachment =
      command.kind === 'image'
        ? Attachment.createImage({
            ...common,
            ...(command.altText ? { altText: command.altText } : {}),
            ...(command.width ? { width: command.width } : {}),
            ...(command.height ? { height: command.height } : {}),
          })
        : Attachment.createAudio({
            ...common,
            duration: command.duration ?? 0,
          });

    await this.chainRepo.saveNote(note);
    await this.chainRepo.saveChainOnly(chain);

    try {
      await this.attachmentRepo.save(attachment, command.blob);
    } catch (error: unknown) {
      chain.removeNote(note.id);
      await this.chainRepo.deleteNoteFromChain(chain, note.id);
      await this.chainRepo.saveChainOnly(chain);
      throw error;
    }

    return {
      note: mapNoteToDTO(note, [attachment]),
      attachment: mapAttachmentToDTO(attachment),
    };
  }
}
