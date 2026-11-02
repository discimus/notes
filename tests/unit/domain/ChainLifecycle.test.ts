import { describe, it, expect } from 'vitest';
import { Chain } from '@domain/entities/Chain.js';
import { InvariantViolationError } from '@shared/types/index.js';

describe('Chain — ciclo de vida', () => {
  it('move uma coleção ativa para a lixeira', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });

    chain.softDelete();

    expect(chain.isDeleted()).toBe(true);
    expect(chain.deletedAt).toBeTruthy();
  });

  it('não move uma coleção arquivada para a lixeira', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });
    chain.archive();

    expect(() => chain.softDelete()).toThrow(InvariantViolationError);
    expect(chain.isDeleted()).toBe(false);
  });

  it('restaura uma coleção da lixeira', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });
    chain.softDelete();

    chain.hardRestore();

    expect(chain.isDeleted()).toBe(false);
    expect(chain.deletedAt).toBeUndefined();
  });

  it('não arquiva uma coleção excluída', () => {
    const { chain } = Chain.createWithHeader({ content: 'Header' });
    chain.softDelete();

    expect(() => chain.archive()).toThrow(InvariantViolationError);
    expect(chain.isArchived()).toBe(false);
  });
});
