import type { ITagRepository } from '@domain/repositories/index.js';
import type { TagDTO } from '@application/dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import type { UUID } from '@shared/types/index.js';
import { mapTagToDTO } from '../mappers/index.js';

export class RenameTag {
  constructor(private readonly tagRepo: ITagRepository) {}

  async execute(tagId: UUID, newName: string): Promise<TagDTO> {
    const tag = await this.tagRepo.findById(tagId);
    if (!tag) throw new NotFoundError('Tag', tagId);
    tag.rename(newName);
    await this.tagRepo.save(tag);
    const count = await this.tagRepo.countChainsForTag(tag.id);
    return mapTagToDTO(tag, count);
  }
}
