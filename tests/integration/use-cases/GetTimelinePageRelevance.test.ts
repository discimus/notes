import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { GetTimelinePage } from '@application/use-cases/GetTimelinePage.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('GetTimelinePage por relevância', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('prioriza match exato sobre repetições do termo', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const chain = await create.execute({
      content: 'bug',
      title: 'Projeto',
    });
    await append.execute({
      chainId: chain.id,
      content: 'bug bug bug',
    });

    const relevant = await timeline.execute({
      chainIds: [chain.id],
      text: 'bug',
      sort: 'relevance',
      offset: 0,
      limit: 10,
    });

    expect(relevant.entries[0]?.note.content).toBe('bug');
  });
});
