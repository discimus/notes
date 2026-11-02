import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  processTextImportQueue,
  type TextImportQueueSnapshot,
} from '@presentation/app/textImportQueue.js';
import type {
  PreparedTextImport,
  TextImportItem,
} from '@presentation/app/textFileImport.js';

function item(index: number, name = `arquivo-${index}.txt`): TextImportItem {
  const file = new File([`conteúdo ${index}`], name, { lastModified: 1000 });
  return {
    index,
    file,
    fileName: name,
    byteSize: file.size,
    status: 'pending',
  };
}

function prepared(file: File): PreparedTextImport {
  return {
    fileName: file.name,
    byteSize: file.size,
    content: file.name,
    preview: file.name,
    characterCount: file.name.length,
    truncated: false,
  };
}

describe('processTextImportQueue', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage');
  });

  it('processa mais de 10 arquivos com concorrência máxima de 5 e preserva a ordem', async () => {
    const items = Array.from({ length: 12 }, (_, index) => item(index));
    const imported: string[] = [];
    let active = 0;
    let maxActive = 0;

    const result = await processTextImportQueue(items, {
      prepareFile: async (file) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return prepared(file);
      },
      importFile: async (file) => {
        imported.push(file.fileName);
      },
    });

    expect(result.succeeded).toBe(12);
    expect(result.failed).toBe(0);
    expect(result.duplicates).toBe(0);
    expect(maxActive).toBeLessThanOrEqual(5);
    expect(maxActive).toBeGreaterThan(1);
    expect(imported).toEqual(items.map((entry) => entry.fileName));
  });

  it('não interrompe os demais quando um arquivo falha na leitura ou na persistência', async () => {
    const items = [item(0), item(1), item(2), item(3)];

    const result = await processTextImportQueue(items, {
      prepareFile: async (file) => {
        if (file.name === 'arquivo-1.txt') throw new Error('texto binário');
        return prepared(file);
      },
      importFile: async (file) => {
        if (file.fileName === 'arquivo-2.txt') throw new Error('falha de escrita');
      },
    });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(2);
    expect(items[1]?.status).toBe('failed');
    expect(items[1]?.error).toContain('binário');
    expect(items[2]?.status).toBe('failed');
    expect(items[2]?.error).toContain('escrita');
    expect(items[0]?.status).toBe('imported');
    expect(items[3]?.status).toBe('imported');
  });

  it('ignora duplicados e arquivos já rejeitados sem tentar lê-los', async () => {
    const pending = item(0);
    const duplicate = { ...item(1), status: 'duplicate' as const, error: 'duplicado' };
    const rejected = { ...item(2), status: 'failed' as const, error: 'vazio' };
    const prepareFile = vi.fn(async (file: File) => prepared(file));

    const result = await processTextImportQueue([pending, duplicate, rejected], {
      prepareFile,
      importFile: async () => undefined,
    });

    expect(prepareFile).toHaveBeenCalledTimes(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.duplicates).toBe(1);
  });

  it('contabiliza conteúdo duplicado como ignorado, não como falha', async () => {
    const items = [item(0), item(1), item(2)];

    const result = await processTextImportQueue(items, {
      prepareFile: async (file) => prepared(file),
      importFile: async (file) =>
        file.fileName === 'arquivo-1.txt' ? 'duplicate' : 'imported',
    });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(items[1]?.status).toBe('duplicate');
    expect(items[1]?.error).toContain('Conteúdo idêntico');
  });

  it('traduz QuotaExceededError em falha individual sem interromper o lote', async () => {
    const items = [item(0), item(1), item(2)];

    const result = await processTextImportQueue(items, {
      prepareFile: async (file) => prepared(file),
      importFile: async (file) => {
        if (file.fileName === 'arquivo-1.txt') {
          throw new DOMException('quota', 'QuotaExceededError');
        }
      },
    });

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(items[1]?.error).toContain('Espaço de armazenamento insuficiente');
  });

  it('falha os pendentes quando a quota utilizável estimada é insuficiente', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 990, quota: 1000 }),
        persisted: vi.fn().mockResolvedValue(false),
      },
      configurable: true,
    });
    const items = [item(0)];
    const importFile = vi.fn(async () => undefined);

    const result = await processTextImportQueue(items, {
      prepareFile: async (file) => prepared(file),
      importFile,
    });

    expect(importFile).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(items[0]?.error).toContain('Espaço de armazenamento insuficiente');
  });

  it('emite progresso com pendentes, processados, sucesso e falhas', async () => {
    const items = [item(0), item(1), item(2)];
    const snapshots: TextImportQueueSnapshot[] = [];

    await processTextImportQueue(items, {
      prepareFile: async (file) => {
        if (file.name === 'arquivo-2.txt') throw new Error('inválido');
        return prepared(file);
      },
      importFile: async () => undefined,
      onProgress: (snapshot) => snapshots.push(snapshot),
    });

    expect(snapshots.length).toBeGreaterThan(1);
    expect(snapshots[0]?.pending).toBe(3);
    expect(snapshots.at(-1)).toMatchObject({
      total: 3,
      processed: 3,
      pending: 0,
      succeeded: 2,
      failed: 1,
      duplicates: 0,
    });
  });
});
