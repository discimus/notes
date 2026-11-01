import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToChain } from '@application/use-cases/AssignTagToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { DeleteTag } from '@application/use-cases/DeleteTag.js';
import { GetAllTags } from '@application/use-cases/GetAllTags.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';
import { RemoveTagFromNote } from '@application/use-cases/RemoveTagFromNote.js';
import { UpdateNoteContent } from '@application/use-cases/UpdateNoteContent.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('Tags em notas', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('associa tag a uma nota e retorna na leitura da cadeia', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
    const details = new GetChainDetails(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const note = await append.execute({ chainId: chain.id, content: 'Tail' });

    const tag = await assign.execute({
      chainId: chain.id,
      noteId: note.id,
      tagName: 'pesquisa',
    });
    const loaded = await details.execute(chain.id);
    const loadedNote = loaded.notes.find((item) => item.id === note.id);

    expect(tag.chainCount).toBe(1);
    expect(loadedNote?.tags?.map((item) => item.name)).toEqual(['pesquisa']);
    expect(loaded.tags).toEqual([]);
  });

  it('conta cadeias distintas quando a mesma tag está na cadeia e na nota', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assignChain = new AssignTagToChain(chainRepo, tagRepo);
    const assignNote = new AssignTagToNote(chainRepo, tagRepo);
    const list = new GetAllTags(tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const header = chain.notes[0]!;

    await assignChain.execute({ chainId: chain.id, tagName: 'projeto' });
    const tag = await assignNote.execute({
      chainId: chain.id,
      noteId: header.id,
      tagName: 'projeto',
    });
    const tags = await list.execute();

    expect(tag.chainCount).toBe(1);
    expect(tags.find((item) => item.name === 'projeto')?.chainCount).toBe(1);
  });

  it('remove a tag apenas da nota', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
    const remove = new RemoveTagFromNote(chainRepo, tagRepo);
    const details = new GetChainDetails(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const header = chain.notes[0]!;
    const tag = await assign.execute({
      chainId: chain.id,
      noteId: header.id,
      tagName: 'temporaria',
    });

    await remove.execute({ chainId: chain.id, noteId: header.id, tagId: tag.id });
    const loaded = await details.execute(chain.id);

    expect(loaded.notes[0]?.tags).toBeUndefined();
    expect((await getAllTags(tagRepo)).find((item) => item.id === tag.id)).toBeTruthy();
  });

  it('rejeita nota que não pertence à cadeia', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });

    await expect(
      assign.execute({
        chainId: chain.id,
        noteId: 'nota-inexistente',
        tagName: 'projeto',
      })
    ).rejects.toThrow('Note');
  });

  it('preserva tags ao atualizar o conteúdo da nota', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
    const update = new UpdateNoteContent(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const header = chain.notes[0]!;
    await assign.execute({
      chainId: chain.id,
      noteId: header.id,
      tagName: 'referencia',
    });

    const updated = await update.execute({
      chainId: chain.id,
      noteId: header.id,
      content: 'Header revisado',
    });

    expect(updated.tags?.map((tag) => tag.name)).toEqual(['referencia']);
  });

  it('remove associações de notas ao excluir a tag', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const assign = new AssignTagToNote(chainRepo, tagRepo);
    const deleteTag = new DeleteTag(tagRepo);
    const details = new GetChainDetails(chainRepo, tagRepo);

    const chain = await create.execute({ content: 'Header' });
    const header = chain.notes[0]!;
    const tag = await assign.execute({
      chainId: chain.id,
      noteId: header.id,
      tagName: 'descartavel',
    });

    await deleteTag.execute(tag.id);
    const loaded = await details.execute(chain.id);

    expect(loaded.notes[0]?.tags).toBeUndefined();
    expect(await getAllTags(tagRepo)).toEqual([]);
  });
});

async function getAllTags(tagRepo: InMemoryTagRepository) {
  return tagRepo.findAll();
}
