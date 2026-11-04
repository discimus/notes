import { beforeEach, describe, expect, it } from 'vitest';
import { LoadExampleScenario } from '@application/use-cases/LoadExampleScenario.js';
import { InMemoryChainRepository } from '@infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '@infrastructure/repositories/InMemoryTagRepository.js';

const REFERENCE_DATE = new Date('2026-03-15T12:00:00.000Z');

describe('LoadExampleScenario — guia de importação', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('cria a coleção que explica a importação de arquivos e pastas', async () => {
    const useCase = new LoadExampleScenario(chainRepo, tagRepo);

    await useCase.execute(REFERENCE_DATE);

    const importChain = await chainRepo.findById('example-chain-import');
    expect(importChain?.title).toBe('Importar arquivos e pastas');
    expect(importChain?.notes).toHaveLength(5);

    const content = importChain?.notes.map((note) => note.content).join('\n') ?? '';
    expect(content).toContain('50 MB');
    expect(content).toContain('Usar datas dos arquivos');
    expect(content).toContain('Importar pasta');
    expect(content).toContain('duplicado');
    expect(content).toContain('Cancelar interrompe');

    const chainTags = await tagRepo.findByChainId('example-chain-import');
    expect(chainTags.map((tag) => tag.name.value)).toEqual(
      expect.arrayContaining(['importação', 'guia'])
    );
  });

  it('reforça privacidade e localização dos dados na coleção de boas-vindas', async () => {
    const useCase = new LoadExampleScenario(chainRepo, tagRepo);

    await useCase.execute(REFERENCE_DATE);

    const welcome = await chainRepo.findById('example-chain-welcome');
    const header = welcome?.notes[0];
    expect(header?.content).toContain('localmente no seu navegador');
    expect(header?.content).toContain('sem conta');

    const shortcuts = welcome?.notes[3];
    expect(shortcuts?.content).toContain('arraste arquivos ou pastas');
  });
});
