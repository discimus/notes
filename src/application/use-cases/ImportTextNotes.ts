import type { IChainRepository } from '@domain/repositories/index.js';
import type { ImportTextNotesCommand, NoteDTO } from '../dto/index.js';
import { NotFoundError, ValidationError } from '@shared/types/index.js';
import { mapNoteToDTO } from '../mappers/index.js';
import { normalizeImportedDate } from './importDate.js';

export class ImportTextNotes {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: ImportTextNotesCommand): Promise<NoteDTO[]> {
    if (command.documents.length === 0) {
      throw new ValidationError('Nenhum documento foi informado para importação.');
    }

    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const notes = command.documents.map((document) =>
      chain.appendImportedText(
        document.content,
        normalizeImportedDate(document.sourceCreatedAt)
      )
    );

    await this.chainRepo.save(chain, notes);
    return notes.map(mapNoteToDTO);
  }
}
