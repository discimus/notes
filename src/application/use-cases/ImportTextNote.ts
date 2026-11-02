import type { IChainRepository } from '@domain/repositories/index.js';
import type { ImportTextNoteCommand, NoteDTO } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import { mapNoteToDTO } from '../mappers/index.js';
import { normalizeImportedDate } from './importDate.js';

export class ImportTextNote {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: ImportTextNoteCommand): Promise<NoteDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const note = chain.appendImportedText(
      command.content,
      normalizeImportedDate(command.sourceCreatedAt),
      {
        ...(command.contentHash ? { contentHash: command.contentHash } : {}),
        ...(command.sourceFileName ? { sourceFileName: command.sourceFileName } : {}),
      }
    );
    await this.chainRepo.saveNote(note);
    await this.chainRepo.saveChainOnly(chain);

    return mapNoteToDTO(note);
  }
}
