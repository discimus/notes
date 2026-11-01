import type {
  IChainRepository,
  ChainFilter,
  IAttachmentRepository,
  ITagRepository,
} from '@domain/repositories/index.js';
import type { Attachment } from '@domain/entities/index.js';
import type { ChainDetailDTO, ChainSummaryDTO } from '../dto/index.js';
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
    const tagDTOs = await Promise.all(
      tags.map(async (t) => mapTagToDTO(t, await this.tagRepo.countChainsForTag(t.id)))
    );
    const tagIds = tags.map((t) => t.id);
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
      attachments
    );
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
