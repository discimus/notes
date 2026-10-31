import { describe, it, expect, beforeEach } from 'vitest';
import { CreateChainWithHeader } from '../../../src/application/use-cases/CreateChainWithHeader.js';
import { AppendNoteToChain } from '../../../src/application/use-cases/AppendNoteToChain.js';
import { AssignTagToChain } from '../../../src/application/use-cases/AssignTagToChain.js';
import { GetChainDetails } from '../../../src/application/use-cases/GetChainDetails.js';
import { InMemoryChainRepository } from '../../../src/infrastructure/repositories/InMemoryChainRepository.js';
import { InMemoryTagRepository } from '../../../src/infrastructure/repositories/InMemoryTagRepository.js';
import { ValidationError, NotFoundError } from '../../../src/shared/types/index.js';

describe('Use cases — integração com repositórios em memória', () => {
  let chainRepo: InMemoryChainRepository;
  let tagRepo: InMemoryTagRepository;

  beforeEach(() => {
    chainRepo = new InMemoryChainRepository();
    tagRepo = new InMemoryTagRepository();
  });

  describe('CreateChainWithHeader', () => {
    it('deve criar cadeia com header e persistir', async () => {
      const useCase = new CreateChainWithHeader(chainRepo, tagRepo);
      const result = await useCase.execute({ content: 'Minha primeira ideia' });

      expect(result.id).toBeTruthy();
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]!.role).toBe('header');
      expect(result.notes[0]!.content).toBe('Minha primeira ideia');
    });

    it('deve criar cadeia com título', async () => {
      const useCase = new CreateChainWithHeader(chainRepo, tagRepo);
      const result = await useCase.execute({ content: 'Conteúdo', title: 'Meu Projeto' });
      expect(result.displayTitle).toBe('Meu Projeto');
    });

    it('deve criar cadeia com tags', async () => {
      const useCase = new CreateChainWithHeader(chainRepo, tagRepo);
      const result = await useCase.execute({
        content: 'Ideia com tags',
        tagNames: ['projeto', 'urgente'],
      });
      expect(result.tags).toHaveLength(2);
      expect(result.tags.map((t) => t.name)).toContain('projeto');
    });

    it('deve reutilizar tag existente ao criar com mesmo nome', async () => {
      const useCase = new CreateChainWithHeader(chainRepo, tagRepo);
      await useCase.execute({ content: 'Cadeia 1', tagNames: ['projeto'] });
      await useCase.execute({ content: 'Cadeia 2', tagNames: ['projeto'] });
      const allTags = await tagRepo.findAll();
      expect(allTags).toHaveLength(1);
    });

    it('deve lançar erro para conteúdo vazio', async () => {
      const useCase = new CreateChainWithHeader(chainRepo, tagRepo);
      await expect(useCase.execute({ content: '' })).rejects.toThrow(ValidationError);
    });
  });

  describe('AppendNoteToChain', () => {
    it('deve anexar tail a cadeia existente', async () => {
      const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
      const appendUC = new AppendNoteToChain(chainRepo);
      const getUC = new GetChainDetails(chainRepo, tagRepo);

      const { id: chainId } = await createUC.execute({ content: 'Header' });
      await appendUC.execute({ chainId, content: 'Tail 1' });
      await appendUC.execute({ chainId, content: 'Tail 2' });

      const detail = await getUC.execute(chainId);
      expect(detail.notes).toHaveLength(3);
      expect(detail.notes[0]!.role).toBe('header');
      expect(detail.notes[1]!.role).toBe('tail');
      expect(detail.notes[2]!.role).toBe('tail');
    });

    it('deve manter ordem das notas', async () => {
      const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
      const appendUC = new AppendNoteToChain(chainRepo);
      const getUC = new GetChainDetails(chainRepo, tagRepo);

      const { id } = await createUC.execute({ content: 'H' });
      await appendUC.execute({ chainId: id, content: 'A' });
      await appendUC.execute({ chainId: id, content: 'B' });
      await appendUC.execute({ chainId: id, content: 'C' });

      const detail = await getUC.execute(id);
      expect(detail.notes.map((n) => n.content)).toEqual(['H', 'A', 'B', 'C']);
      expect(detail.notes.map((n) => n.position)).toEqual([0, 1, 2, 3]);
    });

    it('deve lançar erro para cadeia inexistente', async () => {
      const appendUC = new AppendNoteToChain(chainRepo);
      await expect(appendUC.execute({ chainId: 'invalid', content: 'Tail' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('AssignTagToChain', () => {
    it('deve associar tag a uma cadeia', async () => {
      const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
      const assignUC = new AssignTagToChain(chainRepo, tagRepo);
      const getUC = new GetChainDetails(chainRepo, tagRepo);

      const { id } = await createUC.execute({ content: 'Cadeia sem tag' });
      await assignUC.execute({ chainId: id, tagName: 'nova-tag' });

      const detail = await getUC.execute(id);
      expect(detail.tags.map((t) => t.name)).toContain('nova-tag');
    });

    it('deve normalizar tags duplicadas por capitalização', async () => {
      const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
      const assignUC = new AssignTagToChain(chainRepo, tagRepo);

      const { id: id1 } = await createUC.execute({ content: 'C1' });
      const { id: id2 } = await createUC.execute({ content: 'C2' });

      await assignUC.execute({ chainId: id1, tagName: 'Revisão' });
      await assignUC.execute({ chainId: id2, tagName: 'revisao' });

      const allTags = await tagRepo.findAll();
      expect(allTags).toHaveLength(1);
    });
  });

  describe('Archive / Delete', () => {
    it('deve arquivar cadeia e não listá-la como ativa', async () => {
      const createUC = new CreateChainWithHeader(chainRepo, tagRepo);
      const { ArchiveChain } = await import('../../../src/application/use-cases/ArchiveChain.js');
      const getUC = new GetChainDetails(chainRepo, tagRepo);

      const { id } = await createUC.execute({ content: 'Para arquivar' });
      const archiveUC = new ArchiveChain(chainRepo);
      await archiveUC.execute(id);

      const active = await getUC.getSummaries({ archived: false });
      const archived = await getUC.getSummaries({ archived: true });

      expect(active.find((c) => c.id === id)).toBeUndefined();
      expect(archived.find((c) => c.id === id)).toBeDefined();
    });
  });
});
