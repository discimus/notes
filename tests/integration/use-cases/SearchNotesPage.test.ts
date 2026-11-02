import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { ArchiveChain } from '@application/use-cases/ArchiveChain.js';
import { AssignTagToChain } from '@application/use-cases/AssignTagToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { SearchNotesPage } from '@application/use-cases/SearchNotesPage.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('SearchNotesPage', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;
  let search: SearchNotesPage;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
    search = new SearchNotesPage(chainRepo, tagRepo);
  });

  it('pagina resultados sem repetir notas e informa hasMore', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    for (let index = 0; index < 35; index += 1) {
      await create.execute({ content: `paginacao item ${index}` });
    }

    const first = await search.execute({
      query: 'paginacao',
      offset: 0,
      limit: 20,
    });
    const second = await search.execute({
      query: 'paginacao',
      offset: 20,
      limit: 20,
    });

    expect(first.results).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(second.results).toHaveLength(15);
    expect(second.hasMore).toBe(false);
    expect(
      new Set([...first.results, ...second.results].map((item) => item.noteId))
        .size
    ).toBe(35);
  });

  it('nao retorna notas de coleções arquivadas', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const archive = new ArchiveChain(chainRepo);
    const active = await create.execute({ content: 'termo compartilhado' });
    const archived = await create.execute({ content: 'termo compartilhado' });
    await archive.execute(archived.id);

    const page = await search.execute({
      query: 'compartilhado',
      offset: 0,
      limit: 30,
    });

    expect(page.results.map((item) => item.chainId)).toEqual([active.id]);
  });

  it('ordena por relevancia antes da data', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const byContent = await create.execute({ content: 'prioridade' });
    const byTitle = await create.execute({
      content: 'conteudo sem o termo',
      title: 'Prioridade',
    });

    const page = await search.execute({
      query: 'prioridade',
      offset: 0,
      limit: 30,
    });

    expect(page.results[0]?.chainId).toBe(byTitle.id);
    expect(page.results[1]?.chainId).toBe(byContent.id);
  });

  it('encontra o header de uma coleção pela tag da coleção', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assign = new AssignTagToChain(chainRepo, tagRepo);
    const chain = await create.execute({ content: 'Primeira nota' });
    await append.execute({ chainId: chain.id, content: 'Segunda nota' });
    await assign.execute({ chainId: chain.id, tagName: 'prioridade' });

    const page = await search.execute({
      query: 'prioridade',
      offset: 0,
      limit: 30,
    });

    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.chainId).toBe(chain.id);
    expect(page.results[0]?.noteRole).toBe('header');
  });

  it('encontra notas pela tag da nota', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
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

    const page = await search.execute({
      query: 'importante',
      offset: 0,
      limit: 30,
    });

    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.noteId).toBe(tagged.id);
    expect(page.results[0]?.matchType).toBe('tag');
  });
});
