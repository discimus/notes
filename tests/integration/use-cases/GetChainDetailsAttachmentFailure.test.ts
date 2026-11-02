import { describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import type { IAttachmentRepository } from '@domain/repositories/index.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';

const failingRepository: IAttachmentRepository = {
  async findByChainId() {
    throw new Error("'attachments' is not a known object store name");
  },
  async findByNoteId() {
    return [];
  },
  async save() {},
  async delete() {},
  async deleteByChain() {},
  async getBlob() {
    return null;
  },
};

describe('GetChainDetails com falha de anexos', () => {
  it('continua abrindo a coleção quando o store de anexos está indisponível', async () => {
    const chainRepo = new InMemoryChainRepository();
    const { chain, header } = Chain.createWithHeader({
      content: 'Conteúdo da nota',
      title: 'Projeto',
    });
    await chainRepo.save(chain, [header]);

    const detail = await new GetChainDetails(
      chainRepo,
      new InMemoryTagRepository(),
      failingRepository
    ).execute(chain.id);

    expect(detail.displayTitle).toBe('Projeto');
    expect(detail.notes).toHaveLength(1);
    expect(detail.notes[0]?.content).toBe('Conteúdo da nota');
    expect(detail.notes[0]?.attachments).toBeUndefined();
  });
});
