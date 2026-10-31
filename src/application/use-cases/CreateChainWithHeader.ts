import { Chain } from '@domain/entities/index.js';
import { Tag, ChainTag } from '@domain/entities/index.js';
import type { IChainRepository } from '@domain/repositories/index.js';
import type { ITagRepository } from '@domain/repositories/index.js';
import type { CreateChainCommand, ChainDetailDTO } from '../dto/index.js';
import type { INoteClassifier } from '../ports/index.js';
import { NullClassifier } from '../ports/index.js';
import { normalizeText } from '@shared/utilities/index.js';
import { mapChainToDetail } from '../mappers/index.js';

/**
 * Caso de uso: Cria uma cadeia com seu header.
 * Garante atomicidade: ou cria tudo, ou falha sem estado intermediário.
 */
export class CreateChainWithHeader {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository,
    private readonly classifier: INoteClassifier = new NullClassifier()
  ) {}

  async execute(command: CreateChainCommand): Promise<ChainDetailDTO> {
    const { chain, header } = Chain.createWithHeader({
      content: command.content,
      ...(command.contentType ? { contentType: command.contentType } : {}),
      ...(command.title ? { title: command.title } : {}),
    });

    // Persiste a cadeia e o header atomicamente
    await this.chainRepo.save(chain, [header]);

    const tagIds: string[] = [];
    const tags = [];

    // Associa tags informadas manualmente
    if (command.tagNames && command.tagNames.length > 0) {
      for (const tagName of command.tagNames) {
        const normalizedName = normalizeText(tagName);
        let tag = await this.tagRepo.findByNormalizedName(normalizedName);
        if (!tag) {
          tag = Tag.create(tagName, 'manual');
          await this.tagRepo.save(tag);
        }
        const chainTag = ChainTag.create(chain.id, tag.id);
        await this.tagRepo.assignToChain(chainTag);
        tagIds.push(tag.id);
        tags.push({ ...tag.toData(), chainCount: 0 });
      }
    }

    // Solicita sugestões do classificador (sem bloquear a criação)
    const suggestions = await this.classifier.classify({
      content: command.content,
      existingTags: tags.map((t) => t.name),
    });
    // Sugestões são retornadas para a UI decidir — não aplicadas automaticamente

    return mapChainToDetail(chain, [header], tagIds, tags, suggestions);
  }
}

// Exporta sugestões via DTO separado para a UI
export type { TagSuggestion } from '../ports/index.js';
