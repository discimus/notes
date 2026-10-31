import type { ITagRepository, ITimelineQueryRepository } from '@domain/repositories/index.js';
import type { GetTimelinePageCommand, NoteDTO, TimelinePageDTO } from '../dto/index.js';
import type { NoteData } from '@domain/entities/index.js';

function mapNoteData(note: NoteData): NoteDTO {
  return {
    id: note.id,
    content: note.content,
    chainId: note.chainId,
    position: note.position,
    role: note.role,
    ...(note.title ? { title: note.title } : {}),
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
    let chainIds = command.chainIds;

    if (command.tagIds && command.tagIds.length > 0) {
      const tagChainIds = await Promise.all(
        command.tagIds.map((tagId) => this.tagRepo.findChainIdsByTag(tagId))
      );
      const allowed = new Set(tagChainIds.flat());
      chainIds = chainIds.filter((chainId) => allowed.has(chainId));
    }

    if (chainIds.length === 0) {
      return { entries: [], total: 0, offset, limit, hasMore: false };
    }

    const page = await this.timelineRepo.findTimelinePage({
      chainIds,
      ...(command.from ? { from: command.from } : {}),
      ...(command.to ? { to: command.to } : {}),
      ...(command.text?.trim() ? { text: command.text.trim() } : {}),
      offset,
      limit,
    });

    return {
      entries: page.entries.map((entry) => ({
        note: mapNoteData(entry.note),
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
