import type { IChainRepository } from '@domain/repositories/index.js';
import { TimelineService } from '@domain/services/index.js';
import type { GetTimelineCommand, TimelineDTO } from '@application/dto/index.js';
import { now } from '@shared/utilities/index.js';

/**
 * Caso de uso: Gera a visualização cronológica combinada.
 * Operação de leitura — não altera as cadeias originais.
 */
export class GetChronologicalTimeline {
  private readonly timelineService = new TimelineService();

  constructor(private readonly chainRepo: IChainRepository) {}

  async execute(command: GetTimelineCommand): Promise<TimelineDTO> {
    if (command.chainIds.length === 0) {
      return {
        entries: [],
        filter: {
          chainIds: [],
          ...(command.from ? { from: command.from } : {}),
          ...(command.to ? { to: command.to } : {}),
        },
        createdAt: now(),
      };
    }

    const chains = await Promise.all(
      command.chainIds.map((id) => this.chainRepo.findById(id))
    );
    const validChains = chains.filter((c): c is NonNullable<typeof c> => c !== null && !c.isDeleted());

    const timeline = this.timelineService.createCombinedView(validChains, {
      chainIds: command.chainIds,
      ...(command.from ? { from: command.from } : {}),
      ...(command.to ? { to: command.to } : {}),
    });

    return {
      entries: timeline.entries.map((e) => ({
        note: {
          id: e.note.id,
          content: e.note.content,
          chainId: e.note.chainId,
          position: e.note.position,
          role: e.note.role,
          contentType: e.note.contentType ?? 'text',
          ...(e.note.title ? { title: e.note.title } : {}),
          createdAt: e.note.createdAt,
          updatedAt: e.note.updatedAt,
        },
        chainId: e.chainId,
        chainTitle: e.chainTitle,
      })),
      filter: timeline.filter,
      createdAt: timeline.createdAt,
    };
  }
}
