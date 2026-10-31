import type { IChainRepository } from '@domain/repositories/index.js';
import { NotFoundError } from '@shared/types/index.js';
import type { UUID } from '@shared/types/index.js';

export class DeleteChain {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(chainId: UUID, permanent = false): Promise<void> {
    const chain = await this.chainRepo.findById(chainId);
    if (!chain) throw new NotFoundError('Chain', chainId);

    if (permanent) {
      await this.chainRepo.delete(chainId);
    } else {
      chain.softDelete();
      await this.chainRepo.saveChainOnly(chain);
    }
  }
}
