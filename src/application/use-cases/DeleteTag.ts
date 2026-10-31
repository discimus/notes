import type { ITagRepository } from '@domain/repositories/index.js';
import { NotFoundError } from '@shared/types/index.js';
import type { UUID } from '@shared/types/index.js';

export class DeleteTag {
  constructor(private readonly tagRepo: ITagRepository) {}

  async execute(tagId: UUID): Promise<void> {
    const tag = await this.tagRepo.findById(tagId);
    if (!tag) throw new NotFoundError('Tag', tagId);
    await this.tagRepo.delete(tagId);
  }
}
