import { beforeEach, describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { InMemoryAttachmentRepository } from '@infrastructure/repositories/InMemoryAttachmentRepository.js';
import { AddNoteAttachment } from '@application/use-cases/AddNoteAttachment.js';
import { DeleteNoteAttachment } from '@application/use-cases/DeleteNoteAttachment.js';
import { GetAttachmentBlob } from '@application/use-cases/GetAttachmentBlob.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';

describe('Anexos de nota', () => {
  let chainRepo: InMemoryChainRepository;
  let attachmentRepo: InMemoryAttachmentRepository;
  let chainId: string;
  let noteId: string;

  beforeEach(async () => {
    chainRepo = new InMemoryChainRepository();
    attachmentRepo = new InMemoryAttachmentRepository();
    const { chain, header } = Chain.createWithHeader({
      content: 'Nota com anexos',
      title: 'Projeto',
    });
    await chainRepo.save(chain, [header]);
    chainId = chain.id;
    noteId = header.id;
  });

  it('adiciona imagem, lista no detalhe e remove o blob', async () => {
    const add = new AddNoteAttachment(chainRepo, attachmentRepo);
    const remove = new DeleteNoteAttachment(attachmentRepo);
    const getBlob = new GetAttachmentBlob(attachmentRepo);
    const blob = new Blob(['imagem'], { type: 'image/png' });

    const image = await add.execute({
      chainId,
      noteId,
      kind: 'image',
      fileName: 'print.png',
      mimeType: 'image/png',
      blob,
      width: 640,
      height: 480,
    });

    expect(image).toMatchObject({
      noteId,
      kind: 'image',
      fileName: 'print.png',
      byteSize: blob.size,
      width: 640,
      height: 480,
    });
    expect(await getBlob.execute(image.id)).toBe(blob);

    const detail = await new GetChainDetails(
      chainRepo,
      new InMemoryTagRepository(),
      attachmentRepo
    ).execute(chainId);
    expect(detail.notes[0]?.attachments).toMatchObject([
      { id: image.id, kind: 'image' },
    ]);

    await remove.execute(image.id);
    expect(await getBlob.execute(image.id)).toBeNull();
  });

  it('anexa ao final da cadeia quando noteId não é informado', async () => {
    const chain = await chainRepo.findById(chainId);
    if (!chain) throw new Error('Cadeia não encontrada');
    const firstTail = chain.appendNote('Primeira tail');
    const lastTail = chain.appendNote('Última tail');
    await chainRepo.save(chain, [firstTail, lastTail]);

    const add = new AddNoteAttachment(chainRepo, attachmentRepo);
    await add.execute({
      chainId,
      kind: 'image',
      fileName: 'final.png',
      mimeType: 'image/png',
      blob: new Blob(['imagem'], { type: 'image/png' }),
    });

    const detail = await new GetChainDetails(
      chainRepo,
      new InMemoryTagRepository(),
      attachmentRepo
    ).execute(chainId);
    expect(detail.notes.find((note) => note.id === lastTail.id)?.attachments).toMatchObject([
      { kind: 'image', fileName: 'final.png' },
    ]);
    expect(detail.notes.find((note) => note.id === firstTail.id)?.attachments).toBeUndefined();
    expect(detail.notes).toHaveLength(3);
  });

  it('anexa mídia a uma nota antiga sem criar uma nova nota', async () => {
    const chain = await chainRepo.findById(chainId);
    if (!chain) throw new Error('Cadeia não encontrada');
    const tail = chain.appendNote('Nota mais recente');
    await chainRepo.save(chain, [tail]);

    const add = new AddNoteAttachment(chainRepo, attachmentRepo);
    await add.execute({
      chainId,
      noteId,
      kind: 'image',
      fileName: 'antiga.png',
      mimeType: 'image/png',
      blob: new Blob(['imagem'], { type: 'image/png' }),
    });

    const after = await chainRepo.findById(chainId);
    if (!after) throw new Error('Cadeia não encontrada');
    expect(after.notes).toHaveLength(2);
    expect(after.notes.find((note) => note.id === noteId)?.content).toBe(
      'Nota com anexos'
    );
    expect(after.notes[after.notes.length - 1]?.content).toBe('Nota mais recente');

    const detail = await new GetChainDetails(
      chainRepo,
      new InMemoryTagRepository(),
      attachmentRepo
    ).execute(chainId);
    expect(detail.notes.find((note) => note.id === noteId)?.attachments).toMatchObject([
      { kind: 'image', fileName: 'antiga.png' },
    ]);
  });

  it('adiciona áudio com duração', async () => {
    const add = new AddNoteAttachment(chainRepo, attachmentRepo);
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    const audio = await add.execute({
      chainId,
      noteId,
      kind: 'audio',
      fileName: 'voz.webm',
      mimeType: 'audio/webm',
      blob,
      duration: 8.5,
    });

    expect(audio).toMatchObject({
      kind: 'audio',
      duration: 8.5,
      mimeType: 'audio/webm',
    });
  });

  it('não anexa em cadeia arquivada', async () => {
    const chain = await chainRepo.findById(chainId);
    if (!chain) throw new Error('Cadeia não encontrada');
    chain.archive();
    await chainRepo.saveChainOnly(chain);

    const add = new AddNoteAttachment(chainRepo, attachmentRepo);
    await expect(
      add.execute({
        chainId,
        noteId,
        kind: 'image',
        fileName: 'print.png',
        mimeType: 'image/png',
        blob: new Blob(['x'], { type: 'image/png' }),
      })
    ).rejects.toThrow('arquivada');
  });
});
