import { describe, expect, it } from 'vitest';
import { prepareTextImportBatch } from '@presentation/app/textFileImport.js';

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

  it('processa lotes com mais de dez arquivos', async () => {
    const files = Array.from({ length: 25 }, (_, index) =>
      file('texto', `${index}.txt`)
    );

    const result = await prepareTextImportBatch(files);

    expect(result.valid).toHaveLength(25);
    expect(result.rejected).toHaveLength(0);
  });

  it('não rejeita o lote por tamanho total', async () => {
    const result = await prepareTextImportBatch([
      file('a'.repeat(600 * 1024), 'a.txt'),
      file('b'.repeat(600 * 1024), 'b.txt'),
    ]);

    expect(result.valid).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });
});
