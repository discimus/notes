import type { IChainRepository } from '@domain/repositories/index.js';
import type { NoteDTO, RenameNoteFileCommand } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import { mapNoteToDTO } from '../mappers/index.js';

export class RenameNoteFile {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: RenameNoteFileCommand): Promise<NoteDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.notes.find((n) => n.id === command.noteId);
    if (!note) throw new NotFoundError('Note', command.noteId);

    const otherFileNames = new Set(
      chain.notes
        .filter((candidate) => candidate.id !== note.id)
        .map((candidate) => candidate.sourceFileName)
        .filter((name): name is string => Boolean(name))
    );
    note.renameSourceFileName(command.fileName, otherFileNames);

    await this.chainRepo.saveNote(note);
    await this.chainRepo.saveChainOnly(chain);

    return mapNoteToDTO(note);
  }
}
