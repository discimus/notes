import { describe, it, expect, beforeEach } from 'vitest';
import { CreateChainWithHeader } from '../../../src/application/use-cases/CreateChainWithHeader.js';
import { AppendNoteToChain } from '../../../src/application/use-cases/AppendNoteToChain.js';
import { SearchNotes } from '../../../src/application/use-cases/SearchNotes.js';
import { InMemoryChainRepository } from '../../../src/infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '../../../src/infrastructure/repositories/InMemoryTagRepository.js';

describe('SearchNotes', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  it('deve encontrar notas pelo conteúdo', async () => {
    const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
    const searchUC = new SearchNotes(chainRepo, tagRepo);

    await createUC.execute({ content: 'Aprender TypeScript' });
    await createUC.execute({ content: 'Comprar mantimentos' });

    const results = await searchUC.execute({ query: 'typescript' });
    expect(results).toHaveLength(1);
    expect(results[0]!.snippet).toContain('TypeScript');
  });

  it('deve encontrar com acentos normalizados', async () => {
    const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
    const searchUC = new SearchNotes(chainRepo, tagRepo);

    await createUC.execute({ content: 'Revisão do código' });

    const results = await searchUC.execute({ query: 'revisao' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('deve retornar vazio para query em branco', async () => {
    const searchUC = new SearchNotes(chainRepo, tagRepo);
    const results = await searchUC.execute({ query: '' });
    expect(results).toHaveLength(0);
  });

  it('deve retornar vazio quando não há correspondência', async () => {
    const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
    const searchUC = new SearchNotes(chainRepo, tagRepo);

    await createUC.execute({ content: 'Nota sobre culinária' });

    const results = await searchUC.execute({ query: 'xylophone' });
    expect(results).toHaveLength(0);
  });

  it('deve buscar em tails também', async () => {
    const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
    const appendUC = new AppendNoteToChain(chainRepo);
    const searchUC = new SearchNotes(chainRepo, tagRepo);

    const { id } = await createUC.execute({ content: 'Projeto inicial' });
    await appendUC.execute({ chainId: id, content: 'Detalhes da implementação em Rust' });

    const results = await searchUC.execute({ query: 'rust' });
    expect(results.length).toBeGreaterThan(0);
  });
});
