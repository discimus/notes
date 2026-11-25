import { beforeEach, describe, expect, it } from 'vitest';
import { BackfillDomainTags } from '@application/use-cases/BackfillDomainTags.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('BackfillDomainTags', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('aplica tags de domínio em todas as notas existentes com link', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const backfill = new BackfillDomainTags(chainRepo, tagRepo);

    const first = await create.execute({
      content: 'Link https://github.com/user',
    });
    const second = await create.execute({
      content: 'Sem links aqui',
    });
    await create.execute({
      content: 'Também sem links',
    });

    const result = await backfill.execute();

    expect(result.chainsProcessed).toBe(1);
    expect(result.notesWithLinks).toBe(1);
    expect(result.assigned).toBe(1);
    expect(result.created).toBe(1);

    const firstTags = await tagRepo.findByNoteId(first.notes[0]!.id);
    expect(firstTags.map((tag) => tag.name.value)).toEqual(['github.com']);

    const secondTags = await tagRepo.findByNoteId(second.notes[0]!.id);
    expect(secondTags).toEqual([]);
  });

  it('é idempotente', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const backfill = new BackfillDomainTags(chainRepo, tagRepo);
    await create.execute({ content: 'https://example.com' });

    const first = await backfill.execute();
    const second = await backfill.execute();

    expect(first.assigned).toBe(1);
    expect(second.assigned).toBe(0);
    expect(await tagRepo.findAll()).toHaveLength(1);
  });
});
