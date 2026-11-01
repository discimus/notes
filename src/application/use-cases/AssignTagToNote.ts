import { NoteTag, Tag } from '@domain/entities/index.js';
import type { IChainRepository } from '@domain/repositories/index.js';
import type { ITagRepository } from '@domain/repositories/index.js';
import type { AssignNoteTagCommand, TagDTO } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import { normalizeText } from '@shared/utilities/index.js';
import { mapTagToDTO } from '../mappers/index.js';

export class AssignTagToNote {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(command: AssignNoteTagCommand): Promise<TagDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.notes.find((item) => item.id === command.noteId);
    if (!note) throw new NotFoundError('Note', command.noteId);

    const normalizedName = normalizeText(command.tagName);
    let tag = await this.tagRepo.findByNormalizedName(normalizedName);
    if (!tag) {
      tag = Tag.create(command.tagName, 'manual');
      await this.tagRepo.save(tag);
    }

    await this.tagRepo.assignToNote(
      NoteTag.create(note.id, chain.id, tag.id)
    );

    const count = await this.tagRepo.countChainsForTag(tag.id);
    return mapTagToDTO(tag, count);
  }
}
