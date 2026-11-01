import type {
  ISearchQueryRepository,
  ITagRepository,
} from '@domain/repositories/index.js';
import { normalizeText } from '@shared/utilities/index.js';
import type {
  SearchPageCommand,
  SearchPageDTO,
  SearchResultDTO,
} from '../dto/index.js';

export class SearchNotesPage {
  constructor(
    private readonly searchRepo: ISearchQueryRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(command: SearchPageCommand): Promise<SearchPageDTO> {
    const offset = Math.max(0, command.offset);
    const limit = Math.max(1, command.limit);
    const query = command.query.trim();

    if (!query) {
      return { results: [], offset, limit, hasMore: false };
    }

    const normalizedQuery = normalizeText(query);
    const tags = await this.tagRepo.findAll();
    const matchingTags = tags.filter((tag) =>
      tag.name.normalized.includes(normalizedQuery)
    );
    const tagNoteIds = [
      ...new Set(
        (
          await Promise.all(
            matchingTags.map((tag) => this.tagRepo.findNoteIdsByTag(tag.id))
          )
        ).flat()
      ),
    ];
    const tagChainIds = [
      ...new Set(
        (
          await Promise.all(
            matchingTags.map((tag) => this.tagRepo.findChainIdsByTag(tag.id))
          )
        ).flat()
      ),
    ];

    const page = await this.searchRepo.searchNotesPage({
      query,
      offset,
      limit,
      ...(tagNoteIds.length > 0 ? { tagNoteIds } : {}),
      ...(tagChainIds.length > 0 ? { tagChainIds } : {}),
    });

    const results: SearchResultDTO[] = page.results.map((result) => ({
      noteId: result.noteId,
      chainId: result.chainId,
      chainTitle: result.chainTitle,
      snippet: result.snippet,
      noteCreatedAt: result.noteCreatedAt,
      noteRole: result.noteRole,
      matchType: result.matchType,
    }));

    return {
      results,
      offset,
      limit,
      hasMore: page.hasMore,
    };
  }
}
