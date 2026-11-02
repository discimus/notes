import { describe, expect, it } from 'vitest';
import {
  MAX_TEXT_IMPORT_BYTES,
  planTextImportBatch,
} from '@presentation/app/textFileImport.js';

function file(content: string, name: string, lastModified = 1000): File {
  return new File([content], name, { lastModified });
}

describe('planTextImportBatch', () => {
  it('planeja mais de 10 arquivos sem limite artificial de quantidade', async () => {
    const files = Array.from({ length: 25 }, (_, index) =>
      file(`texto ${index}`, `${index}.txt`, 1000 + index)
    );

    const plan = await planTextImportBatch(files);

    expect(plan.items).toHaveLength(25);
    expect(plan.items?.every((item) => item.status === 'pending')).toBe(true);
    expect(plan.rejected).toHaveLength(0);
  });

  it('rejeita individualmente arquivos vazios e acima do limite de tamanho', async () => {
    const oversized = file('conteúdo', 'grande.txt', 2000);
    Object.defineProperty(oversized, 'size', {
      value: MAX_TEXT_IMPORT_BYTES + 1,
      configurable: true,
    });

    const plan = await planTextImportBatch([
      file('válido', 'ok.txt', 1000),
      file('', 'vazio.txt', 1500),
      oversized,
    ]);

    expect(plan.items?.map((item) => item.status)).toEqual([
      'pending',
      'failed',
      'failed',
    ]);
    expect(plan.rejected).toHaveLength(2);
    expect(plan.rejected[0]?.error).toContain('vazio');
    expect(plan.rejected[1]?.error).toContain('limite');
    expect(plan.totalBytes).toBe(plan.items!.reduce((sum, item) => sum + item.byteSize, 0));
  });

  it('permite nomes iguais e decide duplicidade apenas pelo conteúdo', async () => {
    const plan = await planTextImportBatch([
      file('conteúdo A', 'nota.txt', 1000),
      file('conteúdo B', 'nota.txt', 1000),
      file('conteúdo A', 'outra.txt', 1000),
    ]);

    expect(plan.items?.map((item) => item.status)).toEqual([
      'pending',
      'pending',
      'pending',
    ]);
    expect(plan.rejected).toHaveLength(0);
  });

  it('exige pelo menos um arquivo', async () => {
    await expect(planTextImportBatch([])).rejects.toThrow('pelo menos um');
  });
});
