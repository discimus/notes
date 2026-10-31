import type { IChainRepository } from '@domain/repositories/index.js';
import { NotFoundError } from '@shared/types/index.js';
import type { UUID } from '@shared/types/index.js';

export class ToggleFavorite {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(chainId: UUID): Promise<boolean> {
    const chain = await this.chainRepo.findById(chainId);
    if (!chain) throw new NotFoundError('Chain', chainId);
    chain.toggleFavorite();
    await this.chainRepo.saveChainOnly(chain);
    return chain.isFavorite;
  }
}
