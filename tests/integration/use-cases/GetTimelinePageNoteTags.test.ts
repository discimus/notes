import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { GetTimelinePage } from '@application/use-cases/GetTimelinePage.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('GetTimelinePage com tags de notas', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('filtra apenas as notas que receberam a tag', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const tagged = await append.execute({
      chainId: chain.id,
      content: 'Nota marcada',
    });
    await append.execute({ chainId: chain.id, content: 'Nota livre' });
    const tag = await assign.execute({
      chainId: chain.id,
      noteId: tagged.id,
      tagName: 'marco',
    });

    const result = await timeline.execute({
      chainIds: [chain.id],
      tagIds: [tag.id],
      offset: 0,
      limit: 50,
    });

    expect(result.total).toBe(1);
    expect(result.entries.map((entry) => entry.note.id)).toEqual([tagged.id]);
  });
});
