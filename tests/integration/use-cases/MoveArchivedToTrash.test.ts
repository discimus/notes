import { beforeEach, describe, expect, it } from 'vitest';
import { ArchiveChain } from '@application/use-cases/ArchiveChain.js';
import { CreateChain } from '@application/use-cases/CreateChain.js';
import { MoveArchivedToTrash } from '@application/use-cases/MoveArchivedToTrash.js';
import { RestoreArchivedFromTrash } from '@application/use-cases/RestoreArchivedFromTrash.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import {
  InvariantViolationError,
  NotFoundError,
} from '@shared/types/index.js';

describe('MoveArchivedToTrash', () => {
  let chainRepo: InMemoryChainRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
  });

  it('move uma coleção arquivada para a lixeira', async () => {
    const chain = await new CreateChain(chainRepo).execute({ title: 'Projeto' });
    await new ArchiveChain(chainRepo).execute(chain.id);

    await new MoveArchivedToTrash(chainRepo).execute(chain.id);

    const stored = await chainRepo.findById(chain.id);
    expect(stored?.isArchived()).toBe(false);
    expect(stored?.isDeleted()).toBe(true);
    expect(stored?.deletedAt).toBeTruthy();
  });

  it('rejeita coleção que não está arquivada', async () => {
    const chain = await new CreateChain(chainRepo).execute({ title: 'Projeto' });

    await expect(
      new MoveArchivedToTrash(chainRepo).execute(chain.id)
    ).rejects.toThrow(InvariantViolationError);

    const stored = await chainRepo.findById(chain.id);
    expect(stored?.isDeleted()).toBe(false);
  });

  it('rejeita coleção inexistente', async () => {
    await expect(
      new MoveArchivedToTrash(chainRepo).execute('missing')
    ).rejects.toThrow(NotFoundError);
  });
});

describe('RestoreArchivedFromTrash', () => {
  let chainRepo: InMemoryChainRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
  });

  it('restaura a coleção para o arquivo', async () => {
    const chain = await new CreateChain(chainRepo).execute({ title: 'Projeto' });
    await new ArchiveChain(chainRepo).execute(chain.id);
    await new MoveArchivedToTrash(chainRepo).execute(chain.id);

    await new RestoreArchivedFromTrash(chainRepo).execute(chain.id);

    const stored = await chainRepo.findById(chain.id);
    expect(stored?.isDeleted()).toBe(false);
    expect(stored?.isArchived()).toBe(true);
    expect(stored?.archivedAt).toBeTruthy();
  });

  it('rejeita coleção que não está na lixeira', async () => {
    const chain = await new CreateChain(chainRepo).execute({ title: 'Projeto' });

    await expect(
      new RestoreArchivedFromTrash(chainRepo).execute(chain.id)
    ).rejects.toThrow(InvariantViolationError);
  });
});
