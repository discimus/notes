import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { GetAllTags } from '@application/use-cases/GetAllTags.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('GetAllTags com frequência', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('expõe a quantidade de notas associadas à tag', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
    const list = new GetAllTags(tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const first = await append.execute({ chainId: chain.id, content: 'Nota 1' });
    const second = await append.execute({ chainId: chain.id, content: 'Nota 2' });

    await assign.execute({
      chainId: chain.id,
      noteId: first.id,
      tagName: 'pesquisa',
    });
    await assign.execute({
      chainId: chain.id,
      noteId: second.id,
      tagName: 'pesquisa',
    });

    const tags = await list.execute();
    const pesquisa = tags.find((tag) => tag.name === 'pesquisa');

    expect(pesquisa?.chainCount).toBe(1);
    expect(pesquisa?.noteCount).toBe(2);
  });
});
