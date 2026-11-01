import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateChainWithNote } from '@application/use-cases/CreateChainWithNote.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('CreateChainWithNote', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('cria cadeia e primeira nota em uma única operação', async () => {
    const result = await new CreateChainWithNote(chainRepo).execute({
      title: 'Nova cadeia',
      content: 'const value = 1;',
      contentType: 'code',
    });

    expect(result.chain.displayTitle).toBe('Nova cadeia');
    expect(result.chain.noteCount).toBe(1);
    expect(result.note.role).toBe('tail');
    expect(result.note.position).toBe(1);
    expect(result.note.contentType).toBe('code');

    const detail = await new GetChainDetails(chainRepo, tagRepo).execute(
      result.chain.id
    );
    expect(detail.notes).toHaveLength(1);
    expect(detail.notes[0]?.id).toBe(result.note.id);
  });

  it('não persiste cadeia parcial se o salvamento falhar', async () => {
    vi.spyOn(chainRepo, 'save').mockRejectedValueOnce(new Error('falha'));

    await expect(
      new CreateChainWithNote(chainRepo).execute({
        title: 'Falha',
        content: 'Conteúdo',
      })
    ).rejects.toThrow('falha');

    expect(await chainRepo.findAll()).toHaveLength(0);
  });
});
