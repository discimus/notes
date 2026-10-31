import { describe, it, expect, beforeEach } from 'vitest';
import { CreateChainWithHeader } from '../../../src/application/use-cases/CreateChainWithHeader.js';
import { AppendNoteToChain } from '../../../src/application/use-cases/AppendNoteToChain.js';
import { GetChronologicalTimeline } from '../../../src/application/use-cases/GetChronologicalTimeline.js';
import { InMemoryChainRepository } from '../../../src/infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '../../../src/infrastructure/repositories/InMemoryTagRepository.js';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('GetChronologicalTimeline', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('deve retornar timeline vazia para IDs vazios', async () => {
    const uc = new GetChronologicalTimeline(chainRepo);
    const result = await uc.execute({ chainIds: [] });
    expect(result.entries).toHaveLength(0);
  });

  it('deve ordenar notas cronologicamente', async () => {
    const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
    const appendUC = new AppendNoteToChain(chainRepo);
    const timelineUC = new GetChronologicalTimeline(chainRepo);

    const { id: idA } = await createUC.execute({ content: 'A-Header' });
    await sleep(5);
    const { id: idB } = await createUC.execute({ content: 'B-Header' });
    await sleep(5);
    await appendUC.execute({ chainId: idA, content: 'A-Tail' });
    await sleep(5);
    await appendUC.execute({ chainId: idB, content: 'B-Tail' });

    const result = await timelineUC.execute({ chainIds: [idA, idB] });
    expect(result.entries).toHaveLength(4);

    for (let i = 0; i < result.entries.length - 1; i++) {
      const a = new Date(result.entries[i]!.note.createdAt).getTime();
      const b = new Date(result.entries[i + 1]!.note.createdAt).getTime();
      expect(a).toBeLessThanOrEqual(b);
    }
  });

  it('deve preservar identidade de origem', async () => {
    const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
    const timelineUC = new GetChronologicalTimeline(chainRepo);

    const { id: idA } = await createUC.execute({ content: 'A', title: 'Cadeia A' });
    await sleep(5);
    const { id: idB } = await createUC.execute({ content: 'B', title: 'Cadeia B' });

    const result = await timelineUC.execute({ chainIds: [idA, idB] });

    const entryA = result.entries.find((e) => e.chainId === idA);
    const entryB = result.entries.find((e) => e.chainId === idB);

    expect(entryA?.chainTitle).toBe('Cadeia A');
    expect(entryB?.chainTitle).toBe('Cadeia B');
  });

  it('deve ignorar cadeia inválida', async () => {
    const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
    const timelineUC = new GetChronologicalTimeline(chainRepo);

    const { id } = await createUC.execute({ content: 'Válida' });
    const result = await timelineUC.execute({ chainIds: [id, 'id-invalido'] });

    expect(result.entries).toHaveLength(1);
  });
});
