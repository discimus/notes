import type { IChainRepository, ITagRepository } from '@domain/repositories/index.js';
import type { UpdateNoteCommand, NoteDTO, TagDTO } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import { mapNoteToDTO, mapTagToDTO } from '../mappers/index.js';

/**
 * Caso de uso: Atualiza o conteA�do de uma nota.
 */
export class UpdateNoteContent {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo?: ITagRepository
  ) {}

  async execute(command: UpdateNoteCommand): Promise<NoteDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.notes.find((n) => n.id === command.noteId);
    if (!note) throw new NotFoundError('Note', command.noteId);

    if (command.contentType) {
      note.updateContent(command.content, command.contentType);
    } else {
      note.updateContent(command.content);
    }
    await this.chainRepo.saveNote(note);
    await this.chainRepo.saveChainOnly(chain);

    const tags: TagDTO[] = [];
    const tagRepo = this.tagRepo;
    if (tagRepo) {
      const noteTags = await tagRepo.findByNoteId(note.id);
      tags.push(
        ...(await Promise.all(
          noteTags.map(async (tag) =>
            mapTagToDTO(tag, await tagRepo.countChainsForTag(tag.id))
          )
        ))
      );
    }

    return mapNoteToDTO(note, [], tags);
  }
}
