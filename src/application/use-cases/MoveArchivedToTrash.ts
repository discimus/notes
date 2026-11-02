import type { IChainRepository } from '@domain/repositories/index.js';
import { InvariantViolationError, NotFoundError } from '@shared/types/index.js';
import type { UUID } from '@shared/types/index.js';

export class MoveArchivedToTrash {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(chainId: UUID): Promise<void> {
    const chain = await this.chainRepo.findById(chainId);
    if (!chain) throw new NotFoundError('Chain', chainId);
    if (!chain.isArchived()) {
      throw new InvariantViolationError(
        'Apenas coleções arquivadas podem ser movidas para a lixeira por este fluxo.'
      );
    }

    chain.restore();
    chain.softDelete();
    await this.chainRepo.saveChainOnly(chain);
  }
}
