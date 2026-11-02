import { beforeEach, describe, expect, it } from 'vitest';
import { AppendNoteToChain } from '@application/use-cases/AppendNoteToChain.js';
import { AssignTagToNote } from '@application/use-cases/AssignTagToNote.js';
import { CreateChain } from '@application/use-cases/CreateChain.js';
import { CreateChainWithHeader } from '@application/use-cases/CreateChainWithHeader.js';
import { MoveNotesToChain } from '@application/use-cases/MoveNotesToChain.js';
import { Attachment } from '@domain/entities/index.js';
import { InMemoryAttachmentRepository } from '@infrastructure/repositories/InMemoryAttachmentRepository.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

describe('MoveNotesToChain', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;
  let attachmentRepo: InMemoryAttachmentRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
    attachmentRepo = new InMemoryAttachmentRepository();
  });

  it('move a nota preservando ID, tags, anexos e reposiciona a origem', async () => {
    const createWithHeader = new CreateChainWithHeader(chainRepo, tagRepo);
    const create = new CreateChain(chainRepo);
    const append = new AppendNoteToChain(chainRepo);
    const assignTag = new AssignTagToNote(chainRepo, tagRepo);
    const move = new MoveNotesToChain(chainRepo, tagRepo, attachmentRepo);

    const source = await createWithHeader.execute({ content: 'Header' });
    const movedNote = await append.execute({
      chainId: source.id,
      content: 'Nota movida',
    });
    const remaining = await append.execute({
      chainId: source.id,
      content: 'Nota restante',
    });
    const target = await create.execute({ title: 'Destino' });

    await assignTag.execute({
      chainId: source.id,
      noteId: movedNote.id,
      tagName: 'importante',
    });
    const attachment = Attachment.createImage({
      noteId: movedNote.id,
      chainId: source.id,
      fileName: 'nota.png',
      mimeType: 'image/png',
      byteSize: 4,
    });
    await attachmentRepo.save(attachment, new Blob(['test']));

    const result = await move.execute({
      sourceChainId: source.id,
      targetChainId: target.id,
      noteIds: [movedNote.id],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(movedNote.id);
    expect(result[0]?.chainId).toBe(target.id);
    expect(result[0]?.role).toBe('tail');

    const sourceAfter = await chainRepo.findById(source.id);
    expect(sourceAfter?.notes.map((note) => note.id)).toEqual([
      source.notes[0]!.id,
      remaining.id,
    ]);
    expect(sourceAfter?.notes.map((note) => note.position.value)).toEqual([0, 1]);

    const targetAfter = await chainRepo.findById(target.id);
    expect(targetAfter?.notes.map((note) => note.id)).toEqual([movedNote.id]);
    expect(targetAfter?.notes[0]?.position.value).toBe(1);
    expect((await tagRepo.findByNoteId(movedNote.id))[0]?.name.value).toBe(
      'importante'
    );

    const movedAttachments = await attachmentRepo.findByNoteId(movedNote.id);
    expect(movedAttachments[0]?.chainId).toBe(target.id);
    expect(await attachmentRepo.getBlob(attachment.id)).not.toBeNull();
  });

  it('rejeita mover para a mesma coleção', async () => {
    const create = new CreateChain(chainRepo);
    const move = new MoveNotesToChain(chainRepo, tagRepo, attachmentRepo);
    const chain = await create.execute({ title: 'Projeto' });

    await expect(
      move.execute({
        sourceChainId: chain.id,
        targetChainId: chain.id,
        noteIds: ['note-1'],
      })
    ).rejects.toThrow('destino');
  });
});
