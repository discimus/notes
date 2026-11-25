import type { IChainRepository, ITagRepository } from '@domain/repositories/index.js';
import { extractLinkDomains } from '@shared/utilities/index.js';
import { AssignDomainTagsToNotes } from './AssignDomainTagsToNotes.js';

export interface BackfillDomainTagsResult {
  chainsProcessed: number;
  notesWithLinks: number;
  assigned: number;
  created: number;
  reused: number;
}

/**
 * Aplica uma única vez as tags de domínio às notas já existentes.
 * O controle de execução única fica na camada de apresentação.
 */
export class BackfillDomainTags {
  private readonly assignment: AssignDomainTagsToNotes;

  constructor(
    private readonly chainRepo: IChainRepository,
    tagRepo: ITagRepository
  ) {
    this.assignment = new AssignDomainTagsToNotes(chainRepo, tagRepo);
  }

  async execute(): Promise<BackfillDomainTagsResult> {
    const chains = await this.chainRepo.findAll({ deleted: false });
    const result: BackfillDomainTagsResult = {
      chainsProcessed: 0,
      notesWithLinks: 0,
      assigned: 0,
      created: 0,
      reused: 0,
    };

    for (const chain of chains) {
      const targets = chain.notes
        .filter((note) => extractLinkDomains(note.content).length > 0)
        .map((note) => ({ noteId: note.id }));

      if (targets.length === 0) continue;

      result.chainsProcessed += 1;
      result.notesWithLinks += targets.length;

      const assigned = await this.assignment.execute({
        chainId: chain.id,
        targets,
      });
      result.assigned += assigned.assigned.length;
      result.created += assigned.created;
      result.reused += assigned.reused;
    }

    return result;
  }
}
