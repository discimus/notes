import { beforeEach, describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import { RenameNoteFile } from '@application/use-cases/RenameNoteFile.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('RenameNoteFile', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('persiste o novo nome do arquivo da nota', async () => {
    const chain = Chain.create({ title: 'Coleção' });
    const note = chain.appendImportedText('Conteúdo', undefined, {
      sourceFileName: 'arquivo-original.md',
    });
    await chainRepo.save(chain, [note]);

    const updated = await new RenameNoteFile(chainRepo).execute({
      chainId: chain.id,
      noteId: note.id,
      fileName: 'arquivo-renomeado.md',
    });

    expect(updated.sourceFileName).toBe('arquivo-renomeado.md');

    const details = await new GetChainDetails(chainRepo, tagRepo).execute(chain.id);
    expect(details.notes.find((item) => item.id === note.id)?.sourceFileName).toBe(
      'arquivo-renomeado.md'
    );
  });
});
