import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { ImportTextNotes } from '@application/use-cases/ImportTextNotes.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { sha256Hex } from '@shared/utilities/index.js';

describe('ImportTextNotes duplicidades', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('ignora conteúdos idênticos dentro da mesma seleção e já persistidos', async () => {
    const chain = await new CreateChainWithHeader(chainRepo, tagRepo).execute({
      content: 'Header',
    });
    const useCase = new ImportTextNotes(chainRepo);
    const hashA = await sha256Hex('conteúdo A');
    const hashB = await sha256Hex('conteúdo B');

    const first = await useCase.execute({
      chainId: chain.id,
      documents: [
        { content: 'conteúdo A', contentHash: hashA, sourceFileName: 'a.txt' },
        { content: 'conteúdo A', contentHash: hashA, sourceFileName: 'copia.txt' },
        { content: 'conteúdo B', contentHash: hashB, sourceFileName: 'b.txt' },
      ],
    });
    expect(first).toHaveLength(2);

    const second = await useCase.execute({
      chainId: chain.id,
      documents: [
        { content: 'conteúdo B', contentHash: hashB, sourceFileName: 'b2.txt' },
      ],
    });
    expect(second).toHaveLength(0);

    const stored = await chainRepo.findById(chain.id);
    expect(stored?.notes.filter((note) => note.contentHash)).toHaveLength(2);
  });
});
