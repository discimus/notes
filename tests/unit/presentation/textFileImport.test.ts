import { describe, expect, it } from 'vitest';
import {
  MAX_TEXT_IMPORT_BYTES,
  prepareTextImport,
  TEXT_IMPORT_PREVIEW_CHARS,
} from '@presentation/app/textFileImport.js';

function file(
  parts: BlobPart[],
  name = 'documento.txt',
  lastModified = Date.UTC(2024, 2, 12, 14, 30)
): File {
  return new File(parts, name, { lastModified });
}

describe('prepareTextImport', () => {
  it('lê texto, tamanho e data do arquivo', async () => {
    const content = 'Conteúdo do documento';
    const source = file([content]);
    const result = await prepareTextImport(source);

    expect(result.fileName).toBe('documento.txt');
    expect(result.content).toBe(content);
    expect(result.characterCount).toBe(Array.from(content).length);
    expect(result.byteSize).toBe(source.size);
    expect(result.sourceModifiedAt).toBe('2024-03-12T14:30:00.000Z');
    expect(result.truncated).toBe(false);
  });

  it('trunca apenas o preview de arquivos longos', async () => {
    const content = 'a'.repeat(TEXT_IMPORT_PREVIEW_CHARS + 10);
    const result = await prepareTextImport(file([content]));

    expect(result.content).toBe(content);
    expect(result.preview).toHaveLength(TEXT_IMPORT_PREVIEW_CHARS);
    expect(result.truncated).toBe(true);
  });

  it('rejeita arquivo vazio, binário, encoding inválido e acima do limite', async () => {
    await expect(prepareTextImport(file(['']))).rejects.toThrow('vazio');
    await expect(
      prepareTextImport(file([new Uint8Array([65, 0, 66])]))
    ).rejects.toThrow('binário');
    await expect(
      prepareTextImport(file([new Uint8Array([0xc3, 0x28])]))
    ).rejects.toThrow('UTF-8');
    await expect(
      prepareTextImport(file(['a'.repeat(MAX_TEXT_IMPORT_BYTES + 1)]))
    ).rejects.toThrow('limite');
  });

  it('ignora data futura ou inválida', async () => {
    const future = await prepareTextImport(
      file(['Texto'], 'futuro.txt', Date.now() + 60_000)
    );
    const zero = await prepareTextImport(file(['Texto'], 'zero.txt', 0));

    expect(future.sourceModifiedAt).toBeUndefined();
    expect(zero.sourceModifiedAt).toBeUndefined();
  });
});
