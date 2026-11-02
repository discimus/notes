import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToChain } from '@application/use-cases/AssignTagToChain.js';
import { GetTimelinePage } from '@application/use-cases/GetTimelinePage.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('GetTimelinePage', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('retorna página vazia sem coleções', async () => {
    const uc = new GetTimelinePage(chainRepo, tagRepo);
    const result = await uc.execute({ chainIds: [], offset: 0, limit: 50 });

    expect(result.entries).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('pagina notas sem duplicatas e informa o total', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    await append.execute({ chainId: chain.id, content: 'Tail 1' });
    await append.execute({ chainId: chain.id, content: 'Tail 2' });

    const first = await timeline.execute({ chainIds: [chain.id], offset: 0, limit: 2 });
    const second = await timeline.execute({ chainIds: [chain.id], offset: 2, limit: 2 });

    expect(first.total).toBe(3);
    expect(first.entries).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    expect(second.entries).toHaveLength(1);
    expect(second.hasMore).toBe(false);
    expect(first.entries.map((entry) => entry.note.id)).not.toContain(
      second.entries[0]?.note.id
    );
  });

  it('filtra por texto normalizado', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Planejamento inicial', title: 'Projeto' });

    const result = await timeline.execute({
      chainIds: [chain.id],
      text: 'planejamento',
      offset: 0,
      limit: 50,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.note.content).toContain('Planejamento');
  });

  it('aplica filtro de tags com semântica OR', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignTagToChain(chainRepo, tagRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const a = await create.execute({ content: 'Conteúdo A' });
    const b = await create.execute({ content: 'Conteúdo B' });
    const tagA = await assign.execute({ chainId: a.id, tagName: 'trabalho' });
    const tagB = await assign.execute({ chainId: b.id, tagName: 'pessoal' });

    const onlyA = await timeline.execute({
      chainIds: [a.id, b.id],
      tagIds: [tagA.id],
      offset: 0,
      limit: 50,
    });
    const either = await timeline.execute({
      chainIds: [a.id, b.id],
      tagIds: [tagA.id, tagB.id],
      offset: 0,
      limit: 50,
    });

    expect(onlyA.entries.every((entry) => entry.chainId === a.id)).toBe(true);
    expect(new Set(either.entries.map((entry) => entry.chainId))).toEqual(
      new Set([a.id, b.id])
    );
  });
});
