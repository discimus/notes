import type {
  ITagRepository,
  ITimelineQueryRepository,
  TimelineTagGroup,
} from '@domain/repositories/index.js';
import type {
  GetTimelinePageCommand,
  NoteDTO,
  TagDTO,
  TimelinePageDTO,
} from '../dto/index.js';
import type { NoteData, Tag } from '@domain/entities/index.js';
import { mapTagToDTO } from '../mappers/index.js';

function mapNoteData(note: NoteData, tags: TagDTO[] = []): NoteDTO {
  return {
    id: note.id,
    content: note.content,
    chainId: note.chainId,
    position: note.position,
    role: note.role,
    contentType: note.contentType ?? 'text',
    ...(note.title ? { title: note.title } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export class GetTimelinePage {
  constructor(
    private readonly timelineRepo: ITimelineQueryRepository,
    private readonly tagRepo: ITagRepository
  ) {}

  async execute(command: GetTimelinePageCommand): Promise<TimelinePageDTO> {
    const offset = Math.max(0, command.offset);
    const limit = Math.max(1, command.limit);
    const chainIds = [...new Set(command.chainIds)];
    let tagFilters: TimelineTagGroup[] | undefined;

    if (command.tagIds && command.tagIds.length > 0) {
      tagFilters = await Promise.all(
        command.tagIds.map(async (tagId) => ({
          chainIds: await this.tagRepo.findChainIdsByTag(tagId),
          noteIds: await this.tagRepo.findNoteIdsByTag(tagId),
        }))
      );

      const hasMatch = tagFilters.every(
        (group) => group.chainIds.length > 0 || group.noteIds.length > 0
      );
      if (!hasMatch && (command.tagMode ?? 'any') === 'all') {
        return { entries: [], total: 0, offset, limit, hasMore: false };
      }
      if (
        (command.tagMode ?? 'any') === 'any' &&
        tagFilters.every(
          (group) => group.chainIds.length === 0 && group.noteIds.length === 0
        )
      ) {
        return { entries: [], total: 0, offset, limit, hasMore: false };
      }
    }

    if (chainIds.length === 0) {
      return { entries: [], total: 0, offset, limit, hasMore: false };
    }

    const page = await this.timelineRepo.findTimelinePage({
      chainIds,
      ...(command.from ? { from: command.from } : {}),
      ...(command.to ? { to: command.to } : {}),
      ...(command.text?.trim() ? { text: command.text.trim() } : {}),
      ...(tagFilters ? { tagFilters } : {}),
      ...(command.tagMode ? { tagMode: command.tagMode } : {}),
      ...(command.contentTypes && command.contentTypes.length > 0
        ? { contentTypes: command.contentTypes }
        : {}),
      ...(command.sort ? { sort: command.sort } : {}),
      offset,
      limit,
    });

    const entryTags = await this.tagRepo.findByNoteIds(
      page.entries.map((entry) => entry.note.id)
    );
    const uniqueTags = new Map<string, Tag>();
    entryTags.forEach((tags) => {
      tags.forEach((tag) => uniqueTags.set(tag.id, tag));
    });
    const tagDTOsById = new Map<string, TagDTO>();
    await Promise.all(
      [...uniqueTags.values()].map(async (tag) => {
        tagDTOsById.set(
          tag.id,
          mapTagToDTO(tag, await this.tagRepo.countChainsForTag(tag.id))
        );
      })
    );

    return {
      entries: page.entries.map((entry) => ({
        note: mapNoteData(
          entry.note,
          (entryTags.get(entry.note.id) ?? [])
            .map((tag) => tagDTOsById.get(tag.id))
            .filter((tag): tag is TagDTO => tag !== undefined)
        ),
        chainId: entry.chainId,
        chainTitle: entry.chainTitle,
      })),
      total: page.total,
      offset,
      limit,
      hasMore: offset + page.entries.length < page.total,
    };
  }
}
