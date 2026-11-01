import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { SearchNotes } from '@application/use-cases/SearchNotes.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('SearchNotes com tags de notas', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('encontra apenas a nota que possui a tag pesquisada', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
    const search = new SearchNotes(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Primeira nota' });
    const tagged = await append.execute({
      chainId: chain.id,
      content: 'Segunda nota',
    });
    await append.execute({ chainId: chain.id, content: 'Terceira nota' });
    await assign.execute({
      chainId: chain.id,
      noteId: tagged.id,
      tagName: 'importante',
    });

    const results = await search.execute({ query: 'importante' });

    expect(results).toHaveLength(1);
    expect(results[0]?.noteId).toBe(tagged.id);
    expect(results[0]?.matchType).toBe('tag');
  });
});
