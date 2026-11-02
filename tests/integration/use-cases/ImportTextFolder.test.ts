import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportTextFolder } from '@application/use-cases/ImportTextFolder.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { sha256Hex } from '@shared/utilities/index.js';
import { ValidationError } from '@shared/types/index.js';

describe('ImportTextFolder', () => {
  let chainRepo: InMemoryChainRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
  });

  it('cria uma coleção headerless com as notas na ordem e metadados', async () => {
    const useCase = new ImportTextFolder(chainRepo);
    const hashA = await sha256Hex('conteúdo A');
    const hashB = await sha256Hex('conteúdo B');
    const sourceDate = new Date(2026, 0, 2, 12).toISOString();

    const result = await useCase.execute({
      title: 'Projetos',
      documents: [
        {
          content: 'conteúdo A',
          contentHash: hashA,
          sourceFileName: 'a.txt',
          sourceCreatedAt: sourceDate,
        },
        {
          content: 'conteúdo B',
          contentHash: hashB,
          sourceFileName: 'b.txt',
        },
      ],
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') return;

    expect(result.chain.displayTitle).toBe('Projetos');
    expect(result.chain.notes).toHaveLength(2);
    expect(result.notes.map((note) => note.position)).toEqual([1, 2]);
    expect(result.notes.map((note) => note.sourceFileName)).toEqual([
      'a.txt',
      'b.txt',
    ]);
    expect(result.notes[0]?.createdAt).toBe(sourceDate);
    expect(result.duplicates).toBe(0);

    const stored = await chainRepo.findById(result.chain.id);
    expect(stored?.notes).toHaveLength(2);
  });

  it('ignora duplicados dentro do mesmo lote', async () => {
    const useCase = new ImportTextFolder(chainRepo);
    const hash = await sha256Hex('repetido');

    const result = await useCase.execute({
      title: 'Duplicados',
      documents: [
        { content: 'repetido', contentHash: hash, sourceFileName: 'a.txt' },
        { content: 'repetido', contentHash: hash, sourceFileName: 'b.txt' },
        { content: 'outro', sourceFileName: 'c.txt' },
      ],
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    expect(result.notes).toHaveLength(2);
    expect(result.duplicates).toBe(1);
  });

  it('mantém apenas a primeira ocorrência de um conteúdo repetido', async () => {
    const useCase = new ImportTextFolder(chainRepo);
    const hash = await sha256Hex('repetido');

    const result = await useCase.execute({
      title: 'Duplicados',
      documents: [
        { content: 'repetido', contentHash: hash },
        { content: 'repetido', contentHash: hash },
      ],
    });

    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    expect(result.notes).toHaveLength(1);
    expect(result.duplicates).toBe(1);
    expect(await chainRepo.findAll()).toHaveLength(1);
  });

  it('permite o mesmo conteúdo em coleções diferentes', async () => {
    const useCase = new ImportTextFolder(chainRepo);
    const hash = await sha256Hex('conteúdo compartilhado');

    const first = await useCase.execute({
      title: 'Pasta A',
      documents: [{ content: 'conteúdo compartilhado', contentHash: hash }],
    });
    const second = await useCase.execute({
      title: 'Pasta B',
      documents: [{ content: 'conteúdo compartilhado', contentHash: hash }],
    });

    expect(first.status).toBe('created');
    expect(second.status).toBe('created');
    expect(await chainRepo.findAll()).toHaveLength(2);
  });

  it('não persiste nada se o save falhar', async () => {
    const useCase = new ImportTextFolder(chainRepo);
    const failure = new Error('falha de armazenamento');
    vi.spyOn(chainRepo, 'save').mockRejectedValueOnce(failure);

    await expect(
      useCase.execute({
        title: 'Falha',
        documents: [{ content: 'conteúdo' }],
      })
    ).rejects.toThrow(failure);

    expect(await chainRepo.findAll()).toHaveLength(0);
  });

  it('rejeita lote vazio', async () => {
    const useCase = new ImportTextFolder(chainRepo);
    await expect(
      useCase.execute({ title: 'Vazia', documents: [] })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
