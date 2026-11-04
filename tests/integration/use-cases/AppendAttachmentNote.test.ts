import { beforeEach, describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';
import { InMemoryAttachmentRepository } from '@infrastructure/repositories/InMemoryAttachmentRepository.js';
import { AppendAttachmentNote } from '@application/use-cases/AppendAttachmentNote.js';
import { GetChainDetails } from '@application/use-cases/GetChainDetails.js';

describe('AppendAttachmentNote', () => {
  let chainRepo: InMemoryChainRepository;
  let attachmentRepo: InMemoryAttachmentRepository;
  let append: AppendAttachmentNote;
  let chainId: string;

  beforeEach(async () => {
    chainRepo = new InMemoryChainRepository();
    attachmentRepo = new InMemoryAttachmentRepository();
    append = new AppendAttachmentNote(chainRepo, attachmentRepo);
    const chain = Chain.create({ title: 'Mídias' });
    await chainRepo.save(chain, []);
    chainId = chain.id;
  });

  it('cria uma nota sem texto para hospedar a imagem quando não há notas', async () => {
    const blob = new Blob(['imagem'], { type: 'image/png' });
    const result = await append.execute({
      chainId,
      kind: 'image',
      fileName: 'print.png',
      mimeType: 'image/png',
      blob,
      width: 640,
      height: 480,
    });

    expect(result.note.content).toBe('');
    expect(result.note.attachments).toMatchObject([
      { id: result.attachment.id, kind: 'image', noteId: result.note.id },
    ]);
    expect(result.attachment.noteId).toBe(result.note.id);

    const detail = await new GetChainDetails(
      chainRepo,
      new InMemoryTagRepository(),
      attachmentRepo
    ).execute(chainId);
    expect(detail.notes).toHaveLength(1);
    expect(detail.notes[0]?.id).toBe(result.note.id);
    expect(detail.notes[0]?.content).toBe('');
    expect(detail.notes[0]?.attachments).toMatchObject([
      { kind: 'image', fileName: 'print.png' },
    ]);
  });

  it('cria uma nota individual por mídia em vez de usar a última nota', async () => {
    const first = await append.execute({
      chainId,
      kind: 'image',
      fileName: 'primeira.png',
      mimeType: 'image/png',
      blob: new Blob(['a'], { type: 'image/png' }),
    });
    const second = await append.execute({
      chainId,
      kind: 'audio',
      fileName: 'voz.webm',
      mimeType: 'audio/webm',
      blob: new Blob(['b'], { type: 'audio/webm' }),
      duration: 3,
    });

    expect(first.note.id).not.toBe(second.note.id);

    const detail = await new GetChainDetails(
      chainRepo,
      new InMemoryTagRepository(),
      attachmentRepo
    ).execute(chainId);
    expect(detail.notes).toHaveLength(2);
    expect(detail.notes[0]?.attachments).toMatchObject([{ fileName: 'primeira.png' }]);
    expect(detail.notes[1]?.attachments).toMatchObject([{ fileName: 'voz.webm' }]);
  });
});
