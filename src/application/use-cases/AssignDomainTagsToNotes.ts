import { NoteTag, Tag } from '@domain/entities/index.js';
import type { IChainRepository, ITagRepository } from '@domain/repositories/index.js';
import type {
  AssignDomainTagsCommand,
  AssignDomainTagsResult,
  AssignedDomainTag,
  TagDTO,
} from '../dto/index.js';
import { NotFoundError } from '@shared/types/index.js';
import {
  DEFAULT_MAX_LINK_DOMAINS,
  extractLinkDomains,
  normalizeText,
} from '@shared/utilities/index.js';
import { mapTagToDTO } from '../mappers/index.js';

const ALL_DOMAINS = Number.MAX_SAFE_INTEGER;

export class AssignDomainTagsToNotes {
  constructor(
    private readonly chainRepo: IChainRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(
    command: AssignDomainTagsCommand
  ): Promise<AssignDomainTagsResult> {
    const chain = await this.chainRepo.findById(command.chainId);
    if (!chain) throw new NotFoundError('Chain', command.chainId);
    if (command.targets.length === 0) {
      return { assigned: [], created: 0, reused: 0 };
    }

    const notesById = new Map(chain.notes.map((note) => [note.id, note]));
    const targetIds = [
      ...new Set(
        command.targets
          .map((target) => target.noteId)
          .filter((noteId) => notesById.has(noteId))
      ),
    ];
    const tagsByNoteId = await this.tagRepo.findByNoteIds(targetIds);
    const tagCache = new Map<string, Tag>();
    const assigned: AssignedDomainTag[] = [];
    let created = 0;
    let reused = 0;
    const maxDomains = Math.max(
      0,
      command.maxDomainsPerNote ?? DEFAULT_MAX_LINK_DOMAINS
    );

    if (maxDomains === 0) {
      return { assigned, created, reused };
    }

    for (const target of command.targets) {
      const note = notesById.get(target.noteId);
      if (!note) continue;

      const previousDomains = new Set(
        extractLinkDomains(target.previousContent ?? '', {
          maxDomains: ALL_DOMAINS,
        }).map(normalizeText)
      );
      const existingTags = tagsByNoteId.get(note.id) ?? [];
      const existingNames = new Set(
        existingTags.map((tag) => normalizeText(tag.name.value))
      );
      const domains = extractLinkDomains(note.content, {
        maxDomains: ALL_DOMAINS,
      })
        .filter((domain) => !previousDomains.has(normalizeText(domain)))
        .filter((domain) => !existingNames.has(normalizeText(domain)))
        .slice(0, maxDomains);

      for (const domain of domains) {
        const normalizedName = normalizeText(domain);
        let tag = tagCache.get(normalizedName) ?? null;
        if (!tag) {
          tag = await this.tagRepo.findByNormalizedName(normalizedName);
        }

        if (tag) {
          reused += 1;
        } else {
          tag = Tag.create(domain, 'suggested');
          tag.markAsAccepted();
          await this.tagRepo.save(tag);
          created += 1;
        }

        tagCache.set(normalizedName, tag);
        await this.tagRepo.assignToNote(
          NoteTag.create(note.id, chain.id, tag.id)
        );
        existingNames.add(normalizedName);
        existingTags.push(tag);

        const chainCount = await this.tagRepo.countChainsForTag(tag.id);
        assigned.push({
          noteId: note.id,
          tag: mapTagToDTO(tag, chainCount) as TagDTO,
        });
      }

      tagsByNoteId.set(note.id, existingTags);
    }

    return { assigned, created, reused };
  }
}
