import { beforeEach, describe, expect, it } from 'vitest';
import { CreateChain } from '@application/use-cases/CreateChain.js';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { ImportTextNote } from '@application/use-cases/ImportTextNote.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { ValidationError } from '@shared/types/index.js';

describe('CreateChain', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('cria e persiste coleção apenas com título', async () => {
    const result = await new CreateChain(chainRepo).execute({ title: 'Projeto' });

    expect(result.displayTitle).toBe('Projeto');
    expect(result.noteCount).toBe(0);
    expect(result.notes).toHaveLength(0);

    const detail = await new GetChainDetails(chainRepo, tagRepo).execute(result.id);
    expect(detail.notes).toHaveLength(0);
  });

  it('rejeita título vazio', async () => {
    await expect(
      new CreateChain(chainRepo).execute({ title: '  ' })
    ).rejects.toThrow(ValidationError);
  });

  it('adiciona primeira nota como tail, não header', async () => {
    const chain = await new CreateChain(chainRepo).execute({ title: 'Projeto' });
    const note = await new AppendNoteToChain(chainRepo).execute({
      chainId: chain.id,
      content: 'Primeira nota',
    });

    expect(note.role).toBe('tail');
    expect(note.position).toBe(1);

    const detail = await new GetChainDetails(chainRepo, tagRepo).execute(chain.id);
    expect(detail.notes).toHaveLength(1);
    expect(detail.notes[0]?.role).toBe('tail');
  });

  it('importa primeiro documento como tail', async () => {
    const chain = await new CreateChain(chainRepo).execute({ title: 'Projeto' });
    const note = await new ImportTextNote(chainRepo).execute({
      chainId: chain.id,
      content: 'Documento importado',
    });

    expect(note.role).toBe('tail');
    expect(note.position).toBe(1);
  });
});
