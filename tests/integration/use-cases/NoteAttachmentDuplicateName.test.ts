import { beforeEach, describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryAttachmentRepository } from '@infrastructure/repositories/InMemoryAttachmentRepository.js';
import { AddNoteAttachment } from '@application/use-cases/AddNoteAttachment.js';

describe('Nome de imagem repetido na mesma nota', () => {
  let chainRepo: InMemoryChainRepository;
  let attachmentRepo: InMemoryAttachmentRepository;
  let add: AddNoteAttachment;
  let chainId: string;
  let noteId: string;

  beforeEach(async () => {
    chainRepo = new InMemoryChainRepository();
    attachmentRepo = new InMemoryAttachmentRepository();
    add = new AddNoteAttachment(chainRepo, attachmentRepo);
    const { chain, header } = Chain.createWithHeader({
      content: 'Nota com imagens',
      title: 'Projeto',
    });
    await chainRepo.save(chain, [header]);
    chainId = chain.id;
    noteId = header.id;
  });

  it('bloqueia a mesma imagem na mesma nota sem diferenciar maiúsculas', async () => {
    const image = new Blob(['imagem'], { type: 'image/png' });
    await add.execute({
      chainId,
      noteId,
      kind: 'image',
      fileName: 'Foto.PNG',
      mimeType: 'image/png',
      blob: image,
    });

    await expect(
      add.execute({
        chainId,
        noteId,
        kind: 'image',
        fileName: 'foto.png',
        mimeType: 'image/png',
        blob: image,
      })
    ).rejects.toThrow('Já existe uma imagem com este nome nesta nota.');
  });

  it('permite o mesmo nome em outra nota da coleção', async () => {
    const image = new Blob(['imagem'], { type: 'image/png' });
    await add.execute({
      chainId,
      noteId,
      kind: 'image',
      fileName: 'print.png',
      mimeType: 'image/png',
      blob: image,
    });

    const chain = await chainRepo.findById(chainId);
    if (!chain) throw new Error('Coleção não encontrada');
    const tail = chain.appendNote('Outra nota');
    await chainRepo.save(chain, [tail]);

    const result = await add.execute({
      chainId,
      noteId: tail.id,
      kind: 'image',
      fileName: 'print.png',
      mimeType: 'image/png',
      blob: image,
    });

    expect(result.fileName).toBe('print.png');
    expect(result.noteId).toBe(tail.id);
  });
});
