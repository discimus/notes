import type { ITagRepository } from '@domain/repositories/index.js';
import type { TagDTO } from '@application/dto/index.js';
import { mapTagToDTO } from '../mappers/index.js';

export class GetAllTags {
  constructor(private readonly tagRepo: ITagRepository) {}

  async execute(): Promise<TagDTO[]> {
    const tags = await this.tagRepo.findAll();
    return Promise.all(
      tags.map(async (tag) => mapTagToDTO(tag, await this.tagRepo.countChainsForTag(tag.id)))
    );
  }
}
