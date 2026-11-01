import { describe, expect, it } from 'vitest';
import {
  MAX_TEXT_IMPORT_BATCH_BYTES,
  MAX_TEXT_IMPORT_FILES,
  prepareTextImportBatch,
} from '@presentation/app/textFileImport.js';

function file(content: string | Uint8Array, name: string): File {
  return new File([content], name, { lastModified: Date.UTC(2024, 2, 12, 14, 30) });
}

describe('prepareTextImportBatch', () => {
  it('separa válidos e falhas sem descartar o lote', async () => {
    const result = await prepareTextImportBatch([
      file('linha 1\nlinha 2', 'a.txt'),
      file(new Uint8Array([65, 0, 66]), 'binario.txt'),
      file('', 'vazio.txt'),
    ]);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]?.fileName).toBe('a.txt');
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0]?.fileName).toBe('binario.txt');
    expect(result.rejected[0]?.error).toContain('binário');
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  it('gera HEAD com cinco linhas e indica conteúdo restante', async () => {
    const result = await prepareTextImportBatch([
      file('1\n2\n3\n4\n5\n6\n7', 'linhas.txt'),
    ]);

    expect(result.valid[0]?.head).toBe('1\n2\n3\n4\n5');
    expect(result.valid[0]?.hasMoreLines).toBe(true);
  });

  it('rejeita lote acima da quantidade máxima', async () => {
    const files = Array.from({ length: MAX_TEXT_IMPORT_FILES + 1 }, (_, index) =>
      file('texto', `${index}.txt`)
    );

    await expect(prepareTextImportBatch(files)).rejects.toThrow('no máximo');
  });

  it('rejeita lote acima do tamanho total', async () => {
    await expect(
      prepareTextImportBatch([file('a'.repeat(MAX_TEXT_IMPORT_BATCH_BYTES + 1), 'grande.txt')])
    ).rejects.toThrow('limite');
  });
});
