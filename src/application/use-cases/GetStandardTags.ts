import { STANDARD_TAGS } from '@domain/services/tagSuggestions/index.js';
import type { StandardTagDTO } from '../dto/index.js';

export class GetStandardTags {
  execute(): StandardTagDTO[] {
    return STANDARD_TAGS.map((tag) => ({
      id: `standard:${tag.key}`,
      name: tag.name,
      normalizedName: tag.key,
      category: tag.category,
      chainCount: 0,
      noteCount: 0,
      isStandard: true,
    }));
  }
}
