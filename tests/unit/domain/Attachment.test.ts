import { describe, expect, it } from 'vitest';
import { Attachment } from '@domain/entities/index.js';
import { ValidationError } from '@shared/types/index.js';

const base = {
  noteId: 'note-1',
  chainId: 'chain-1',
  fileName: 'print.png',
  mimeType: 'image/png',
  byteSize: 1024,
};

describe('Attachment', () => {
  it('cria uma imagem com alt padrão e dimensões opcionais', () => {
    const attachment = Attachment.createImage({
      ...base,
      width: 800,
      height: 600,
    });

    expect(attachment.kind).toBe('image');
    expect(attachment.altText).toBe('print.png');
    expect(attachment.width).toBe(800);
    expect(attachment.height).toBe(600);
    expect(attachment.toData()).toMatchObject({
      noteId: 'note-1',
      chainId: 'chain-1',
      kind: 'image',
      fileName: 'print.png',
      mimeType: 'image/png',
      byteSize: 1024,
    });
  });

  it('cria áudio com duração normalizada', () => {
    const attachment = Attachment.createAudio({
      ...base,
      fileName: 'voz.webm',
      mimeType: 'audio/webm;codecs=opus',
      duration: 12.345,
    });

    expect(attachment.kind).toBe('audio');
    expect(attachment.duration).toBe(12.3);
  });

  it('rejeita mime, tamanho e duração inválidos', () => {
    expect(() =>
      Attachment.createImage({ ...base, mimeType: 'image/svg+xml' })
    ).toThrow(ValidationError);
    expect(() =>
      Attachment.createImage({ ...base, byteSize: 4 * 1024 * 1024 })
    ).toThrow(ValidationError);
    expect(() =>
      Attachment.createAudio({
        ...base,
        fileName: 'voz.webm',
        mimeType: 'audio/webm',
        duration: 0,
      })
    ).toThrow(ValidationError);
  });

  it('reconstitui dados persistidos', () => {
    const data = Attachment.createImage(base).toData();
    const restored = Attachment.reconstitute(data);

    expect(restored.toData()).toEqual(data);
  });
});
