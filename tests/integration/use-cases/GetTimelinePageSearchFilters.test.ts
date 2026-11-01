import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToChain } from '@application/use-cases/AssignTagToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { GetTimelinePage } from '@application/use-cases/GetTimelinePage.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('GetTimelinePage como busca', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filtra por tipo de conteúdo', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header em texto' });
    await append.execute({
      chainId: chain.id,
      content: 'const value = 1;',
      contentType: 'code',
    });

    const result = await timeline.execute({
      chainIds: [chain.id],
      contentTypes: ['code'],
      offset: 0,
      limit: 50,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.note.contentType).toBe('code');
  });

  it('aplica semântica ALL entre tags e retorna tags na nota', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assignChain = new AssignTagToChain(chainRepo, tagRepo);
    const assignNote = new AssignTagToNote(chainRepo, tagRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const first = await append.execute({
      chainId: chain.id,
      content: 'Primeira nota',
    });
    const second = await append.execute({
      chainId: chain.id,
      content: 'Segunda nota',
    });
    const chainTag = await assignChain.execute({
      chainId: chain.id,
      tagName: 'projeto',
    });
    const noteTag = await assignNote.execute({
      chainId: chain.id,
      noteId: second.id,
      tagName: 'importante',
    });

    const result = await timeline.execute({
      chainIds: [chain.id],
      tagIds: [chainTag.id, noteTag.id],
      tagMode: 'all',
      offset: 0,
      limit: 50,
    });

    expect(result.entries.map((entry) => entry.note.id)).toEqual([second.id]);
    expect(result.entries[0]?.note.tags?.map((tag) => tag.name)).toContain(
      'importante'
    );
    expect(result.entries.some((entry) => entry.note.id === first.id)).toBe(false);
  });

  it('ordena por mais recentes quando solicitado', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const timeline = new GetTimelinePage(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Mais antiga' });
    vi.setSystemTime(new Date('2026-05-11T10:00:00.000Z'));
    await append.execute({ chainId: chain.id, content: 'Intermediária' });
    vi.setSystemTime(new Date('2026-05-12T10:00:00.000Z'));
    await append.execute({ chainId: chain.id, content: 'Mais recente' });

    const result = await timeline.execute({
      chainIds: [chain.id],
      sort: 'newest',
      offset: 0,
      limit: 50,
    });

    expect(result.entries.map((entry) => entry.note.content)).toEqual([
      'Mais recente',
      'Intermediária',
      'Mais antiga',
    ]);
  });
});
