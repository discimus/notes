import type { IChainRepository } from '@domain/repositories/index.js';
import { InvariantViolationError, NotFoundError } from '@shared/types/index.js';
import type { UUID } from '@shared/types/index.js';

export class RestoreArchivedFromTrash {
  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(chainId: UUID): Promise<void> {
    const chain = await this.chainRepo.findById(chainId);
    if (!chain) throw new NotFoundError('Chain', chainId);
    if (!chain.isDeleted()) {
      throw new InvariantViolationError(
        'Apenas coleções na lixeira podem ser restauradas para o arquivo.'
      );
    }

    chain.hardRestore();
    chain.archive();
    await this.chainRepo.saveChainOnly(chain);
  }
}
