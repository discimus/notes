import { Chain, Note, Tag } from '@domain/entities/index.js';
import { ChainTag, NoteTag } from '@domain/entities/index.js';
import type { IChainRepository, ITagRepository } from '@domain/repositories/index.js';
import { normalizeText } from '@shared/utilities/index.js';
import { createExampleScenario } from '../demo/exampleScenario.js';

export interface LoadExampleScenarioResult {
  primaryChainId: string;
  chainCount: number;
  noteCount: number;
  tagCount: number;
}

export class LoadExampleScenario {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(referenceDate?: Date): Promise<LoadExampleScenarioResult> {
    const scenario = createExampleScenario(referenceDate);
    const tagsByName = new Map<string, Tag>();
    let noteCount = 0;

    for (const chainSpec of scenario.chains) {
      const noteSpecs = [chainSpec.header, ...chainSpec.notes];
      const notes = noteSpecs.map((noteSpec, index) =>
        Note.reconstitute({
          id: `${chainSpec.id}-note-${index}`,
          content: noteSpec.content,
          chainId: chainSpec.id,
          position: index,
          role: index === 0 ? 'header' : 'tail',
          contentType: noteSpec.contentType ?? 'text',
          ...(index === 0 ? { title: chainSpec.title } : {}),
          createdAt: noteSpec.createdAt,
          updatedAt: noteSpec.createdAt,
        })
      );

      const header = notes[0];
      if (!header) continue;

      const updatedAt = notes.reduce(
        (latest, note) => (note.createdAt > latest ? note.createdAt : latest),
        chainSpec.createdAt
      );
      const chain = Chain.reconstitute(
        {
          id: chainSpec.id,
          headerNoteId: header.id,
          title: chainSpec.title,
          createdAt: chainSpec.createdAt,
          updatedAt,
        },
        notes
      );

      await this.chainRepo.save(chain, notes);
      noteCount += notes.length;

      for (const tagName of chainSpec.tags) {
        const tag = await this.ensureTag(tagsByName, tagName);
        await this.tagRepo.assignToChain(ChainTag.create(chain.id, tag.id));
      }

      for (const [index, noteSpec] of noteSpecs.entries()) {
        const note = notes[index];
        if (!note) continue;

        for (const tagName of noteSpec.tags ?? []) {
          const tag = await this.ensureTag(tagsByName, tagName);
          await this.tagRepo.assignToNote(
            NoteTag.create(note.id, chain.id, tag.id)
          );
        }
      }
    }

    return {
      primaryChainId: scenario.primaryChainId,
      chainCount: scenario.chains.length,
      noteCount,
      tagCount: tagsByName.size,
    };
  }

  private async ensureTag(cache: Map<string, Tag>, name: string): Promise<Tag> {
    const normalized = normalizeText(name);
    const cached = cache.get(normalized);
    if (cached) return cached;

    let tag = await this.tagRepo.findByNormalizedName(normalized);
    if (!tag) {
      tag = Tag.create(name, 'manual');
      await this.tagRepo.save(tag);
    }

    cache.set(normalized, tag);
    return tag;
  }
}
