import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { ImportTextFile } from '@application/use-cases/ImportTextFile.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { sha256Hex } from '@shared/utilities/index.js';

describe('ImportTextFile — dedupe por coleção', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  async function createChain(): Promise<string> {
    const chain = await new CreateChainWithHeader(chainRepo, tagRepo).execute({
      content: 'Header',
    });
    return chain.id;
  }

  it('permite o mesmo conteúdo em coleções diferentes', async () => {
    const firstChainId = await createChain();
    const secondChainId = await createChain();
    const useCase = new ImportTextFile(chainRepo);
    const contentHash = await sha256Hex('conteúdo compartilhado');

    const first = await useCase.execute({
      chainId: firstChainId,
      content: 'conteúdo compartilhado',
      contentHash,
    });
    const second = await useCase.execute({
      chainId: secondChainId,
      content: 'conteúdo compartilhado',
      contentHash,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(await chainRepo.hasContentHashInChain(firstChainId, contentHash)).toBe(
      true
    );
    expect(
      await chainRepo.hasContentHashInChain(secondChainId, contentHash)
    ).toBe(true);
  });

  it('continua ignorando duplicados na mesma coleção', async () => {
    const chainId = await createChain();
    const useCase = new ImportTextFile(chainRepo);
    const contentHash = await sha256Hex('conteúdo repetido');

    const first = await useCase.execute({
      chainId,
      content: 'conteúdo repetido',
      contentHash,
    });
    const second = await useCase.execute({
      chainId,
      content: 'conteúdo repetido',
      contentHash,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
});
