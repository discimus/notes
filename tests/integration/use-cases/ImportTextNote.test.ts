import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { ImportTextNote } from '@application/use-cases/ImportTextNote.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('ImportTextNote', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('importa texto como tail com data de origem', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const chain = await create.execute({ content: 'Header' });
    const sourceCreatedAt = '2024-03-12T14:30:00.000Z';

    const note = await new ImportTextNote(chainRepo).execute({
      chainId: chain.id,
      content: '  Documento importado\n',
      sourceCreatedAt,
    });

    expect(note.position).toBe(1);
    expect(note.contentType).toBe('text');
    expect(note.createdAt).toBe(sourceCreatedAt);
    expect(note.updatedAt).toBe(sourceCreatedAt);

    const detail = await new GetChainDetails(chainRepo, tagRepo).execute(chain.id);
    expect(detail.notes.at(-1)?.id).toBe(note.id);
  });

  it('usa agora quando a data é futura ou inválida', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const chain = await create.execute({ content: 'Header' });
    const before = Date.now();

    const future = await new ImportTextNote(chainRepo).execute({
      chainId: chain.id,
      content: 'Futuro',
      sourceCreatedAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const invalid = await new ImportTextNote(chainRepo).execute({
      chainId: chain.id,
      content: 'Inválido',
      sourceCreatedAt: 'não é data',
    });

    expect(Date.parse(future.createdAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(invalid.createdAt)).toBeGreaterThanOrEqual(before);
  });
});
