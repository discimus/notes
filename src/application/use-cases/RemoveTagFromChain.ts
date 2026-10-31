import type { IChainRepository } from '@domain/repositories/index.js';
import type { ITagRepository } from '@domain/repositories/index.js';
import type { RemoveTagCommand } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';

export class RemoveTagFromChain {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(command: RemoveTagCommand): Promise<void> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    await this.tagRepo.removeFromChain(command.chainId, command.tagId);
  }
}
