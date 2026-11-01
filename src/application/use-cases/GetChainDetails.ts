import type {
  IChainRepository,
  ChainFilter,
  IAttachmentRepository,
  ITagRepository,
} from '@domain/repositories/index.js';
import type { Attachment, Tag } from '@domain/entities/index.js';
import type { ChainDetailDTO, ChainSummaryDTO, TagDTO } from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import { mapChainToDetail, mapChainToSummary, mapTagToDTO } from '../mappers/index.js';
import type { UUID } from '@shared/types/index.js';

export class GetChainDetails {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository,
    private readonly attachmentRepo?: IAttachmentRepository
  ) {}

  async execute(chainId: UUID): Promise<ChainDetailDTO> {
    const chain = await this.chainRepo.findById(chainId);
    if (!chain) throw new NotFoundError('Chain', chainId);

    const tags = await this.tagRepo.findByChainId(chainId);
    const noteTagsByNoteId = await this.tagRepo.findByNoteIds(
      chain.notes.map((note) => note.id)
    );
    const uniqueTags = new Map<string, Tag>();
    tags.forEach((tag) => uniqueTags.set(tag.id, tag));
    noteTagsByNoteId.forEach((noteTags) => {
      noteTags.forEach((tag) => uniqueTags.set(tag.id, tag));
    });
    const tagDTOsById = await this.mapTags([...uniqueTags.values()]);
    const tagDTOs = tags
      .map((tag) => tagDTOsById.get(tag.id))
      .filter((tag): tag is TagDTO => tag !== undefined);
    const tagIds = tags.map((t) => t.id);
    const noteTagDTOs = new Map<string, TagDTO[]>();
    noteTagsByNoteId.forEach((noteTags, noteId) => {
      noteTagDTOs.set(
        noteId,
        noteTags
          .map((tag) => tagDTOsById.get(tag.id))
          .filter((tag): tag is TagDTO => tag !== undefined)
      );
    });

    let attachments: Attachment[] = [];
    if (this.attachmentRepo) {
      try {
        attachments = await this.attachmentRepo.findByChainId(chainId);
      } catch {
        attachments = [];
      }
    }

    return mapChainToDetail(
      chain,
      [...chain.notes],
      tagIds,
      tagDTOs,
      undefined,
      attachments,
      noteTagDTOs
    );
  }

  private async mapTags(tags: Tag[]): Promise<Map<string, TagDTO>> {
    const entries = await Promise.all(
      tags.map(async (tag) => [
        tag.id,
        mapTagToDTO(tag, await this.tagRepo.countChainsForTag(tag.id)),
      ] as const)
    );
    return new Map(entries);
  }

  async getSummaries(filter?: { archived?: boolean; deleted?: boolean; tagIds?: UUID[]; search?: string }): Promise<ChainSummaryDTO[]> {
    const baseFilter: ChainFilter = {
      deleted: filter?.deleted ?? false,
      ...(filter?.deleted ? {} : { archived: filter?.archived ?? false }),
      ...filter,
    };
    const chains = await this.chainRepo.findAll(baseFilter, 'updatedAt');

    return Promise.all(
      chains.map(async (chain) => {
        const tags = await this.tagRepo.findByChainId(chain.id);
        const tagDTOs = await Promise.all(
          tags.map(async (t) => mapTagToDTO(t, await this.tagRepo.countChainsForTag(t.id)))
        );
        return mapChainToSummary(chain, tags.map((t) => t.id), tagDTOs);
      })
    );
  }
}
