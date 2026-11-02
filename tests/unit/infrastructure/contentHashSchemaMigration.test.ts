import { describe, expect, it, vi } from 'vitest';
import { ensureContentHashIndexes } from '@infrastructure/persistence/schema.js';

type EnsureArgs = Parameters<typeof ensureContentHashIndexes>;

function fakeIndexDatabase(uniqueGlobal: boolean) {
  const indexNames = new Set(['by-contentHash']);
  const deleteIndex = vi.fn((name: string) => {
    indexNames.delete(name);
  });
  const createIndex = vi.fn((name: string, _keyPath: string | string[]) => {
    indexNames.add(name);
  });
  const store = {
    indexNames: {
      contains: (name: string) => indexNames.has(name),
    },
    index: (name: string) => {
      if (name === 'by-contentHash') return { unique: uniqueGlobal };
      return { unique: false };
    },
    deleteIndex,
    createIndex,
  };
  const transaction = {
    objectStore: () => store,
  };
  const db = {
    objectStoreNames: { contains: (name: string) => name === 'notes' },
  };
  return {
    db: db as unknown as EnsureArgs[0],
    transaction: transaction as unknown as EnsureArgs[1],
    indexNames,
    deleteIndex,
    createIndex,
  };
}

describe('ensureContentHashIndexes', () => {
  it('recria o índice global como não único e cria o índice por coleção', () => {
    const fake = fakeIndexDatabase(true);

    ensureContentHashIndexes(fake.db, fake.transaction);

    expect(fake.deleteIndex).toHaveBeenCalledWith('by-contentHash');
    expect(fake.createIndex).toHaveBeenCalledWith(
      'by-contentHash',
      'contentHash'
    );
    expect(fake.createIndex).toHaveBeenCalledWith(
      'by-chainId-contentHash',
      ['chainId', 'contentHash']
    );
    expect(fake.indexNames.has('by-chainId-contentHash')).toBe(true);
  });

  it('não recria o índice global quando já é não único', () => {
    const fake = fakeIndexDatabase(false);
    fake.indexNames.add('by-chainId-contentHash');

    ensureContentHashIndexes(fake.db, fake.transaction);

    expect(fake.deleteIndex).not.toHaveBeenCalled();
    expect(fake.createIndex).not.toHaveBeenCalled();
  });
});
