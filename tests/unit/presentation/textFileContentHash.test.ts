import { describe, expect, it } from 'vitest';
import { prepareTextImport } from '@presentation/app/textFileImport.js';

function file(content: string, name: string): File {
  return new File([content], name, { lastModified: 1000 });
}

describe('prepareTextImport contentHash', () => {
  it('gera o mesmo hash para conteúdos iguais com nomes diferentes', async () => {
    const first = await prepareTextImport(file('mesmo conteúdo', 'a.txt'));
    const second = await prepareTextImport(file('mesmo conteúdo', 'b.txt'));

    expect(first.contentHash).toBeDefined();
    expect(first.contentHash).toBe(second.contentHash);
  });

  it('gera hashes diferentes para arquivos de mesmo nome com conteúdos diferentes', async () => {
    const first = await prepareTextImport(file('conteúdo A', 'nota.txt'));
    const second = await prepareTextImport(file('conteúdo B', 'nota.txt'));

    expect(first.contentHash).not.toBe(second.contentHash);
  });
});
