import { beforeEach, describe, expect, it } from 'vitest';
import { AssignTagToNotes } from '@application/use-cases/AssignTagToNotes.js';
import { CreateChainWithNote } from '@application/use-cases/CreateChainWithNote.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { NotFoundError, ValidationError } from '@shared/types/index.js';

describe('AssignTagToNotes', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('atribui a mesma tag a notas de coleções diferentes', async () => {
    const createChain = new CreateChainWithNote(chainRepo);
    const first = await createChain.execute({
      title: 'Coleção A',
      content: 'Primeira nota',
    });
    const second = await createChain.execute({
      title: 'Coleção B',
      content: 'Segunda nota',
    });

    const result = await new AssignTagToNotes(chainRepo, tagRepo).execute({
      notes: [
        { chainId: first.chain.id, noteId: first.note.id },
        { chainId: second.chain.id, noteId: second.note.id },
      ],
      tagName: 'projeto',
    });

    expect(result.tag.name).toBe('projeto');
    expect(result.assigned).toBe(2);
    expect(await tagRepo.findAll()).toHaveLength(1);
    expect(
      (await tagRepo.findByNoteId(first.note.id)).map((tag) => tag.name.value)
    ).toEqual(['projeto']);
    expect(
      (await tagRepo.findByNoteId(second.note.id)).map((tag) => tag.name.value)
    ).toEqual(['projeto']);
  });

  it('é idempotente ao repetir a mesma tag na mesma nota', async () => {
    const created = await new CreateChainWithNote(chainRepo).execute({
      title: 'Coleção',
      content: 'Nota',
    });
    const useCase = new AssignTagToNotes(chainRepo, tagRepo);
    const command = {
      notes: [{ chainId: created.chain.id, noteId: created.note.id }],
      tagName: 'projeto',
    };

    await useCase.execute(command);
    await useCase.execute(command);

    expect((await tagRepo.findByNoteId(created.note.id)).length).toBe(1);
  });

  it('não cria tag quando houver nota inválida', async () => {
    const created = await new CreateChainWithNote(chainRepo).execute({
      title: 'Coleção',
      content: 'Nota',
    });

    await expect(
      new AssignTagToNotes(chainRepo, tagRepo).execute({
        notes: [
          { chainId: created.chain.id, noteId: 'nota-inexistente' },
        ],
        tagName: 'projeto',
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await tagRepo.findAll()).toHaveLength(0);
  });

  it('rejeita seleção vazia', async () => {
    await expect(
      new AssignTagToNotes(chainRepo, tagRepo).execute({
        notes: [],
        tagName: 'projeto',
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
