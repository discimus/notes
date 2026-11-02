import type {
  IAttachmentRepository,
  IChainRepository,
} from '@domain/repositories/index.js';
import type { AddNoteAttachmentCommand, AttachmentDTO } from '../dto/index.js';
import {
  InvariantViolationError,
  NotFoundError,
} from '@shared/types/index.js';
import { Attachment } from '@domain/entities/index.js';
import { mapAttachmentToDTO } from '../mappers/index.js';

export class AddNoteAttachment {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly attachmentRepo: IAttachmentRepository
  ) {}

  async execute(command: AddNoteAttachmentCommand): Promise<AttachmentDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);
    if (chain.isDeleted()) {
      throw new InvariantViolationError('Não é possível anexar mídia a uma coleção excluída.');
    }
    if (chain.isArchived()) {
      throw new InvariantViolationError('Não é possível anexar mídia a uma coleção arquivada.');
    }

    const note = command.noteId
      ? chain.notes.find((item) => item.id === command.noteId)
      : [...chain.notes]
          .sort((a, b) => a.position.compareTo(b.position))
          .at(-1);
    if (!note) {
      if (command.noteId) throw new NotFoundError('Note', command.noteId);
      throw new InvariantViolationError(
        'Não há nota no final da coleção para receber o anexo.'
      );
    }

    if (command.kind === 'image') {
      const fileName = command.fileName.trim().normalize('NFC').toLowerCase();
      const existing = await this.attachmentRepo.findByNoteId(note.id);
      if (
        existing.some(
          (attachment) =>
            attachment.kind === 'image' &&
            attachment.fileName.trim().normalize('NFC').toLowerCase() === fileName
        )
      ) {
        throw new InvariantViolationError(
          'Já existe uma imagem com este nome nesta nota.'
        );
      }
    }

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

    await this.attachmentRepo.save(attachment, command.blob);
    return mapAttachmentToDTO(attachment);
  }
}
