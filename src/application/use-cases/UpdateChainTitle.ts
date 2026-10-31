import type { IChainRepository } from '@domain/repositories/index.js';
import type { UpdateChainTitleCommand } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';

export class UpdateChainTitle {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: UpdateChainTitleCommand): Promise<void> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    chain.updateTitle(command.title);
    await this.chainRepo.saveChainOnly(chain);
  }
}
