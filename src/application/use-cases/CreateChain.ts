import { Chain } from '@domain/entities/index.js';
import type { IChainRepository } from '@domain/repositories/index.js';
import type { ChainDetailDTO, CreateChainTitleCommand } from '../dto/index.js';
import { mapChainToDetail } from '../mappers/index.js';

export class CreateChain {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: CreateChainTitleCommand): Promise<ChainDetailDTO> {
    const chain = Chain.create({ title: command.title });
    await this.chainRepo.save(chain, []);

    return mapChainToDetail(chain, [], [], []);
  }
}
