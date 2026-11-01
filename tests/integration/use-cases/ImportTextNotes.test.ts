import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { ImportTextNotes } from '@application/use-cases/ImportTextNotes.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('ImportTextNotes', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('importa documentos como tails separadas e preserva o header', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const chain = await create.execute({ content: 'Header' });
    const useCase = new ImportTextNotes(chainRepo);

    const notes = await useCase.execute({
      chainId: chain.id,
      documents: [
        { content: 'Documento A', sourceCreatedAt: '2024-03-12T14:30:00.000Z' },
        { content: 'Documento B', sourceCreatedAt: '2023-01-05T08:00:00.000Z' },
      ],
    });

    expect(notes).toHaveLength(2);
    expect(notes[0]?.position).toBe(1);
    expect(notes[1]?.position).toBe(2);
    expect(notes[0]?.contentType).toBe('text');
    expect(notes[0]?.createdAt).toBe('2024-03-12T14:30:00.000Z');

    const detail = await new GetChainDetails(chainRepo, tagRepo).execute(chain.id);
    expect(detail.notes).toHaveLength(3);
    expect(detail.notes[0]?.role).toBe('header');
    expect(detail.notes.at(-1)?.content).toBe('Documento B');
  });

  it('não persiste parcialmente quando o lote falha', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const chain = await create.execute({ content: 'Header' });
    vi.spyOn(chainRepo, 'save').mockRejectedValueOnce(new Error('falha de escrita'));

    await expect(
      new ImportTextNotes(chainRepo).execute({
        chainId: chain.id,
        documents: [{ content: 'Documento A' }, { content: 'Documento B' }],
      })
    ).rejects.toThrow('falha de escrita');

    const detail = await new GetChainDetails(chainRepo, tagRepo).execute(chain.id);
    expect(detail.notes).toHaveLength(1);
  });

  it('usa a data atual quando a data de origem é inválida', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const chain = await create.execute({ content: 'Header' });
    const before = Date.now();

    const [note] = await new ImportTextNotes(chainRepo).execute({
      chainId: chain.id,
      documents: [{ content: 'Sem data', sourceCreatedAt: 'inválida' }],
    });

    expect(Date.parse(note!.createdAt)).toBeGreaterThanOrEqual(before);
  });
});
