import type { IChainRepository } from '@domain/repositories/index.js';
import type { AppendNoteCommand, NoteDTO } from '../dto/index.js';
import { NotFoundError, InvariantViolationError } from '@shared/types/index.js';
import { mapNoteToDTO } from '../mappers/index.js';

/**
 * Caso de uso: Anexa uma nota ao final de uma cadeia existente.
 */
export class AppendNoteToChain {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: AppendNoteCommand): Promise<NoteDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) {
      throw new NotFoundError('Chain', command.chainId);
    }
    if (chain.isDeleted()) {
      throw new InvariantViolationError('Não é possível adicionar notas a uma cadeia excluída.');
    }

    const note = chain.appendNote(command.content);
    await this.chainRepo.saveNote(note);
    await this.chainRepo.saveChainOnly(chain);

    return mapNoteToDTO(note);
  }
}
