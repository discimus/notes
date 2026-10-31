import type { ITagRepository } from '../../domain/repositories/index.js';
import type { TagDTO } from '../dto/index.js';
import { NotFoundError } from '../../shared/types/index.js';
import { mapTagToDTO } from './shared/mappers.js';
import type { UUID } from '../../shared/types/index.js';

export class GetAllTags {
  constructor(private readonly tagRepo: ITagRepository) {}

  async execute(): Promise<TagDTO[]> {
    const tags = await this.tagRepo.findAll();
    return Promise.all(
      tags.map(async (t) => mapTagToDTO(t, await this.tagRepo.countChainsForTag(t.id)))
    );
  }
}

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

export class DeleteTag {
  constructor(private readonly tagRepo: ITagRepository) {}

  async execute(tagId: UUID): Promise<void> {
    const tag = await this.tagRepo.findById(tagId);
    if (!tag) throw new NotFoundError('Tag', tagId);
    await this.tagRepo.delete(tagId);
  }
}
