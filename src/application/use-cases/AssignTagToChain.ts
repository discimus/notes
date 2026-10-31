import { Tag, ChainTag } from '../../domain/entities/index.js';
import type { IChainRepository } from '../../domain/repositories/index.js';
import type { ITagRepository } from '../../domain/repositories/index.js';
import type { AssignTagCommand, TagDTO } from '../dto/index.js';
import { NotFoundError } from '../../shared/types/index.js';
import { normalizeText } from '../../shared/utilities/index.js';
import { mapTagToDTO } from './shared/mappers.js';

export class AssignTagToChain {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(command: AssignTagCommand): Promise<TagDTO> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);

    const normalizedName = normalizeText(command.tagName);
    let tag = await this.tagRepo.findByNormalizedName(normalizedName);
    if (!tag) {
      tag = Tag.create(command.tagName, 'manual');
      await this.tagRepo.save(tag);
    }

    const chainTag = ChainTag.create(command.chainId, tag.id);
    await this.tagRepo.assignToChain(chainTag);

    const count = await this.tagRepo.countChainsForTag(tag.id);
    return mapTagToDTO(tag, count);
  }
}
