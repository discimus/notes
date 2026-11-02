import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { DeleteNote } from '@application/use-cases/DeleteNote.js';
import { Attachment } from '@domain/entities/index.js';
import { InMemoryAttachmentRepository } from '@infrastructure/repositories/InMemoryAttachmentRepository.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('DeleteNote', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;
  let attachmentRepo: InMemoryAttachmentRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
    attachmentRepo = new InMemoryAttachmentRepository();
  });

  it('remove a nota, reindexa a cadeia e limpa tags e anexos', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assignTag = new AssignTagToNote(chainRepo, tagRepo);
    const deleteNote = new DeleteNote(chainRepo, tagRepo, attachmentRepo);

    const chain = await create.execute({ content: 'Header' });
    const removed = await append.execute({
      chainId: chain.id,
      content: 'Nota removida',
    });
    const remaining = await append.execute({
      chainId: chain.id,
      content: 'Nota mantida',
    });
    await assignTag.execute({
      chainId: chain.id,
      noteId: removed.id,
      tagName: 'temporaria',
    });
    const attachment = Attachment.createImage({
      noteId: removed.id,
      chainId: chain.id,
      fileName: 'nota.png',
      mimeType: 'image/png',
      byteSize: 4,
    });
    await attachmentRepo.save(attachment, new Blob(['test']));

    await deleteNote.execute({ chainId: chain.id, noteId: removed.id });

    const updated = await chainRepo.findById(chain.id);
    expect(updated?.notes.map((note) => note.id)).toEqual([
      chain.notes[0]!.id,
      remaining.id,
    ]);
    expect(updated?.notes.map((note) => note.position.value)).toEqual([0, 1]);
    expect(await tagRepo.findByNoteId(removed.id)).toEqual([]);
    expect(await attachmentRepo.findByNoteId(removed.id)).toEqual([]);
    expect(await attachmentRepo.getBlob(attachment.id)).toBeNull();
  });

  it('falha quando a nota não pertence à cadeia', async () => {
    const create = new CreateChainWithHeader(chainRepo, tagRepo);
    const deleteNote = new DeleteNote(chainRepo, tagRepo, attachmentRepo);
    const chain = await create.execute({ content: 'Header' });

    await expect(
      deleteNote.execute({ chainId: chain.id, noteId: 'missing-note' })
    ).rejects.toThrow('Note');
  });
});
