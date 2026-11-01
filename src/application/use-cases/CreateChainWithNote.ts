import { Chain } from '@domain/entities/index.js';
import type { IChainRepository } from '@domain/repositories/index.js';
import type {
  CreateChainWithNoteCommand,
  CreateChainWithNoteResult,
} from '../dto/index.js';
import { mapChainToDetail, mapNoteToDTO } from '../mappers/index.js';

export class CreateChainWithNote {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(
    command: CreateChainWithNoteCommand
  ): Promise<CreateChainWithNoteResult> {
    const chain = Chain.create({ title: command.title });
    const note = chain.appendNote(
      command.content,
      command.contentType
    );

    await this.chainRepo.save(chain, [note]);

    return {
      chain: mapChainToDetail(chain, [note], [], []),
      note: mapNoteToDTO(note),
    };
  }
}
