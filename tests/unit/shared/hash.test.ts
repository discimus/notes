import { describe, expect, it } from 'vitest';
import { sha256Hex } from '@shared/utilities/index.js';

describe('sha256Hex', () => {
  it('gera o hash SHA-256 conhecido de um texto', async () => {
    await expect(sha256Hex('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('gera o mesmo hash para conteúdos iguais e hashes distintos para conteúdos diferentes', async () => {
    const first = await sha256Hex('conteúdo idêntico');
    const second = await sha256Hex('conteúdo idêntico');
    const other = await sha256Hex('conteúdo diferente');

    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
