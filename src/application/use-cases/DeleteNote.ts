import type {
  IAttachmentRepository,
  IChainRepository,
  ITagRepository,
} from '@domain/repositories/index.js';
import type { DeleteNoteCommand } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';

export class DeleteNote {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository,
    private readonly attachmentRepo: IAttachmentRepository
  ) {}

  async execute(command: DeleteNoteCommand): Promise<void> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.notes.find((item) => item.id === command.noteId);
    if (!note) throw new NotFoundError('Note', command.noteId);

    chain.removeNote(note.id);

    const tags = await this.tagRepo.findByNoteId(note.id);
    await Promise.all(
      tags.map((tag) => this.tagRepo.removeFromNote(note.id, tag.id))
    );

    const attachments = await this.attachmentRepo.findByNoteId(note.id);
    await Promise.all(
      attachments.map((attachment) =>
        this.attachmentRepo.delete(attachment.id)
      )
    );

    await this.chainRepo.deleteNoteFromChain(chain, note.id);
  }
}
