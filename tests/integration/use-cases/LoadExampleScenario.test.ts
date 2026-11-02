import { beforeEach, describe, expect, it } from 'vitest';
import { LoadExampleScenario } from '@application/use-cases/LoadExampleScenario.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

const REFERENCE_DATE = new Date('2026-03-15T12:00:00.000Z');

describe('LoadExampleScenario', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('cria coleções, notas e tags de exemplo', async () => {
    const useCase = new LoadExampleScenario(chainRepo, tagRepo);

    const result = await useCase.execute(REFERENCE_DATE);

    expect(result).toEqual({
      primaryChainId: 'example-chain-welcome',
      chainCount: 3,
      noteCount: 12,
      tagCount: 10,
    });

    const chains = await chainRepo.findAll();
    expect(chains.map((chain) => chain.displayTitle)).toEqual(
      expect.arrayContaining(['Bem-vindo ao Notes', 'Projeto Aurora', 'Referências'])
    );

    const welcome = await chainRepo.findById(result.primaryChainId);
    expect(welcome?.title).toBe('Bem-vindo ao Notes');
    expect(welcome?.notes).toHaveLength(4);
    expect(welcome?.notes[0]?.contentType).toBe('text');
    expect(welcome?.notes[1]?.contentType).toBe('markdown');
    expect(welcome?.notes[2]?.contentType).toBe('code');
    expect(welcome?.notes[2]?.content).toContain('const exemplo');

    const welcomeTags = await tagRepo.findByChainId(result.primaryChainId);
    expect(welcomeTags.map((tag) => tag.name.value)).toEqual(
      expect.arrayContaining(['exemplo', 'guia'])
    );

    const noteTags = await tagRepo.findByNoteId('example-chain-welcome-note-1');
    expect(noteTags.map((tag) => tag.name.value)).toContain('importante');
  });

  it('distribui as notas ao longo dos dias para a timeline', async () => {
    const useCase = new LoadExampleScenario(chainRepo, tagRepo);
    const result = await useCase.execute(REFERENCE_DATE);

    const references = await chainRepo.findById('example-chain-references');
    expect(references?.notes.map((note) => note.createdAt)).toEqual([
      '2026-03-10T08:00:00.000Z',
      '2026-03-13T18:00:00.000Z',
      '2026-03-14T09:00:00.000Z',
      '2026-03-15T08:30:00.000Z',
    ]);
    expect(result.primaryChainId).toBe('example-chain-welcome');
  });
});
