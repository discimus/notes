import { beforeEach, describe, expect, it } from 'vitest';
import { Tag } from '@domain/entities/index.js';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignDomainTagsToNotes } from '@application/use-cases/AssignDomainTagsToNotes.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('AssignDomainTagsToNotes', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('atribui uma tag por domínio encontrado na nota', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignDomainTagsToNotes(chainRepo, tagRepo);
    const chain = await create.execute({
      content:
        'Referências: https://www.github.com/user e https://docs.github.com/guide',
    });
    const note = chain.notes[0]!;

    const result = await assign.execute({
      chainId: chain.id,
      targets: [{ noteId: note.id }],
    });

    expect(result.assigned.map((item) => item.tag.name)).toEqual([
      'github.com',
      'docs.github.com',
    ]);
    expect(result.created).toBe(2);
    const tags = await tagRepo.findByNoteId(note.id);
    expect(tags.map((tag) => tag.name.value).sort()).toEqual([
      'docs.github.com',
      'github.com',
    ]);
    expect(tags.every((tag) => tag.origin === 'accepted')).toBe(true);
  });

  it('é idempotente e reutiliza tags existentes', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignDomainTagsToNotes(chainRepo, tagRepo);
    const chain = await create.execute({
      content: 'Link https://example.com/a',
    });
    const note = chain.notes[0]!;

    const first = await assign.execute({
      chainId: chain.id,
      targets: [{ noteId: note.id }],
    });
    const second = await assign.execute({
      chainId: chain.id,
      targets: [{ noteId: note.id }],
    });

    expect(first.created).toBe(1);
    expect(second.assigned).toEqual([]);
    expect(await tagRepo.findAll()).toHaveLength(1);
  });

  it('considera apenas domínios novos em relação ao conteúdo anterior', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assign = new AssignDomainTagsToNotes(chainRepo, tagRepo);
    const chain = await create.execute({ content: 'Header' });
    const note = await append.execute({
      chainId: chain.id,
      content: 'https://example.com e https://github.com',
    });

    const result = await assign.execute({
      chainId: chain.id,
      targets: [
        {
          noteId: note.id,
          previousContent: 'https://example.com',
        },
      ],
    });

    expect(result.assigned.map((item) => item.tag.name)).toEqual(['github.com']);
  });

  it('respeita o limite de domínios por nota', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignDomainTagsToNotes(chainRepo, tagRepo);
    const chain = await create.execute({
      content:
        'https://a.com https://b.com https://c.com https://d.com',
    });

    const result = await assign.execute({
      chainId: chain.id,
      targets: [{ noteId: chain.notes[0]!.id }],
      maxDomainsPerNote: 2,
    });

    expect(result.assigned.map((item) => item.tag.name)).toEqual([
      'a.com',
      'b.com',
    ]);
  });

  it('reutiliza tag já cadastrada com outra capitalização', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignDomainTagsToNotes(chainRepo, tagRepo);
    const existing = Tag.create('Example.com', 'manual');
    await tagRepo.save(existing);
    const chain = await create.execute({
      content: 'https://EXAMPLE.com/path',
    });

    const result = await assign.execute({
      chainId: chain.id,
      targets: [{ noteId: chain.notes[0]!.id }],
    });

    expect(result.created).toBe(0);
    expect(result.reused).toBe(1);
    expect(result.assigned[0]?.tag.id).toBe(existing.id);
    expect(await tagRepo.findAll()).toHaveLength(1);
  });
});
