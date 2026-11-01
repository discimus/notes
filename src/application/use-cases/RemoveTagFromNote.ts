import type { IChainRepository } from '@domain/repositories/index.js';
import type { ITagRepository } from '@domain/repositories/index.js';
import type { RemoveNoteTagCommand } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';

export class RemoveTagFromNote {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(command: RemoveNoteTagCommand): Promise<void> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.notes.find((item) => item.id === command.noteId);
    if (!note) throw new NotFoundError('Note', command.noteId);

    await this.tagRepo.removeFromNote(command.noteId, command.tagId);
  }
}
