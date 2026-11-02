import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { ImportTextFile } from '@application/use-cases/ImportTextFile.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { sha256Hex } from '@shared/utilities/index.js';

describe('ImportTextFile', () => {
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

  it('importa arquivos com o mesmo nome quando o conteúdo é diferente', async () => {
    const chainId = await createChain();
    const useCase = new ImportTextFile(chainRepo);
    const firstHash = await sha256Hex('conteúdo A');
    const secondHash = await sha256Hex('conteúdo B');

    const first = await useCase.execute({
      chainId,
      content: 'conteúdo A',
      contentHash: firstHash,
      sourceFileName: 'nota.txt',
    });
    const second = await useCase.execute({
      chainId,
      content: 'conteúdo B',
      contentHash: secondHash,
      sourceFileName: 'nota.txt',
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(first.note?.id).not.toBe(second.note?.id);

    const chain = await chainRepo.findById(chainId);
    const imported = chain?.notes.filter((note) =>
      note.sourceFileName?.startsWith('nota')
    );
    expect(imported).toHaveLength(2);
    expect(imported?.map((note) => note.sourceFileName)).toEqual([
      'nota.txt',
      'nota-02.txt',
    ]);
    expect(imported?.map((note) => note.content)).toEqual([
      'conteúdo A',
      'conteúdo B',
    ]);
  });

  it('ignora conteúdos idênticos mesmo com nomes diferentes', async () => {
    const chainId = await createChain();
    const useCase = new ImportTextFile(chainRepo);
    const contentHash = await sha256Hex('mesmo conteúdo');

    const first = await useCase.execute({
      chainId,
      content: 'mesmo conteúdo',
      contentHash,
      sourceFileName: 'primeiro.txt',
    });
    const second = await useCase.execute({
      chainId,
      content: 'mesmo conteúdo',
      contentHash,
      sourceFileName: 'segundo.txt',
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.note).toBeUndefined();

    const chain = await chainRepo.findById(chainId);
    expect(chain?.notes.filter((note) => note.contentHash === contentHash)).toHaveLength(1);
  });

  it('considera notas já persistidas na verificação de duplicidade', async () => {
    const chainId = await createChain();
    const useCase = new ImportTextFile(chainRepo);
    const contentHash = await sha256Hex('conteúdo persistido');

    await useCase.execute({
      chainId,
      content: 'conteúdo persistido',
      contentHash,
      sourceFileName: 'original.txt',
    });

    const duplicate = await useCase.execute({
      chainId,
      content: 'conteúdo persistido',
      contentHash,
      sourceFileName: 'cópia.txt',
    });

    expect(duplicate.duplicate).toBe(true);
    expect(await chainRepo.hasContentHash(contentHash)).toBe(true);
  });
});
