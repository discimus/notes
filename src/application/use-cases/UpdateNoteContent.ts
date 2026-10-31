import type { IChainRepository } from '../../domain/repositories/index.js';
import type { UpdateNoteCommand, NoteDTO } from '../dto/index.js';
import { NotFoundError } from '../../shared/types/index.js';
import { mapNoteToDTO } from './shared/mappers.js';

/**
 * Caso de uso: Atualiza o conteúdo de uma nota.
 */
export class UpdateNoteContent {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: UpdateNoteCommand): Promise<NoteDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.notes.find((n) => n.id === command.noteId);
    if (!note) throw new NotFoundError('Note', command.noteId);

    note.updateContent(command.content);
    await this.chainRepo.saveNote(note);
    await this.chainRepo.saveChainOnly(chain);

    return mapNoteToDTO(note);
  }
}
