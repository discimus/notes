import type { IChainRepository } from '../../domain/repositories/index.js';
import type { ITagRepository } from '../../domain/repositories/index.js';
import { SearchService } from '../../domain/services/index.js';
import type { SearchCommand, SearchResultDTO } from '../dto/index.js';

export class SearchNotes {
  private readonly searchService = new SearchService();

  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(command: SearchCommand): Promise<SearchResultDTO[]> {
    if (!command.query.trim()) return [];

    const chains = await this.chainRepo.findAll({ deleted: false }, 'updatedAt');
    const tagsByChainId = new Map<string, import('../../domain/entities/index.js').Tag[]>();

    for (const chain of chains) {
      const tags = await this.tagRepo.findByChainId(chain.id);
      tagsByChainId.set(chain.id, tags);
    }

    const results = this.searchService.search(command.query, chains, tagsByChainId);

    return results.map((r) => ({
      noteId: r.noteId,
      chainId: r.chainId,
      chainTitle: r.chainTitle,
      snippet: r.snippet,
      noteCreatedAt: r.noteCreatedAt,
      noteRole: r.noteRole,
      matchType: r.matchType,
    }));
  }
}
