import { describe, expect, it } from 'vitest';
import { Chain } from '@domain/entities/index.js';
import { InvariantViolationError } from '@shared/types/index.js';

describe('Nota de anexo', () => {
  it('cria uma tail sem texto mesmo sem notas prévias', () => {
    const chain = Chain.create({ title: 'Mídias' });
    const note = chain.appendAttachmentNote();

    expect(note.role).toBe('tail');
    expect(note.position.value).toBe(1);
    expect(note.content).toBe('');
    expect(note.sourceFileName).toBeUndefined();
    expect(chain.notes).toHaveLength(1);
  });

  it('anexa depois das notas existentes', () => {
    const chain = Chain.create({ title: 'Mídias' });
    const first = chain.appendNote('Primeira');
    const media = chain.appendAttachmentNote();

    expect(first.position.value).toBe(1);
    expect(media.position.value).toBe(2);
    expect(media.content).toBe('');
  });

  it('não cria nota de anexo em coleção arquivada', () => {
    const chain = Chain.create({ title: 'Mídias' });
    chain.archive();

    expect(() => chain.appendAttachmentNote()).toThrow(InvariantViolationError);
  });
});
