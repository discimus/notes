import { Chain, Note } from '@domain/entities/index.js';
import type {
  IChainRepository,
  ChainSortOrder,
  ChainFilter,
  ITimelineQueryRepository,
  TimelinePageQuery,
  TimelinePageResult,
} from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';
import { normalizeText } from '@shared/utilities/index.js';

/**
 * Repositório em memória para testes unitários e de integração.
 */
export class InMemoryChainRepository implements IChainRepository, ITimelineQueryRepository {
  private chains = new Map<string, { chain: Chain; notes: Note[] }>();

  async findById(id: UUID): Promise<Chain | null> {
    const entry = this.chains.get(id);
    if (!entry) return null;
    return Chain.reconstitute(entry.chain.toData(), entry.notes.map((n) => Note.reconstitute(n.toData())));
  }

  async findAll(filter: ChainFilter = {}, _sort: ChainSortOrder = 'updatedAt'): Promise<Chain[]> {
    const all = [...this.chains.values()].map(({ chain, notes }) =>
      Chain.reconstitute(chain.toData(), notes.map((n) => Note.reconstitute(n.toData())))
    );

    let result = all;
    if (filter.deleted === false) result = result.filter((c) => !c.isDeleted());
    if (filter.deleted === true) result = result.filter((c) => c.isDeleted());
    if (filter.archived === false) result = result.filter((c) => !c.isArchived());
    if (filter.archived === true) result = result.filter((c) => c.isArchived());

    if (filter.search) {
      const q = normalizeText(filter.search);
      result = result.filter((c) =>
        c.notes.some((n) => normalizeText(n.content).includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async save(chain: Chain, notes: Note[]): Promise<void> {
    const merged = new Map<string, Note>();
    for (const note of this.chains.get(chain.id)?.notes ?? []) {
      merged.set(note.id, Note.reconstitute(note.toData()));
    }
    for (const note of notes) {
      merged.set(note.id, Note.reconstitute(note.toData()));
    }
    const mergedNotes = [...merged.values()].sort((a, b) =>
      a.position.compareTo(b.position)
    );

    this.chains.set(chain.id, {
      chain: Chain.reconstitute(chain.toData(), mergedNotes),
      notes: mergedNotes,
    });
  }

  async saveChainOnly(chain: Chain): Promise<void> {
    const entry = this.chains.get(chain.id);
    const notes = entry ? entry.notes : [];
    this.chains.set(chain.id, {
      chain: Chain.reconstitute(chain.toData(), notes.map((n) => Note.reconstitute(n.toData()))),
      notes,
    });
  }

  async saveNote(note: Note): Promise<void> {
    const entry = this.chains.get(note.chainId);
    if (!entry) return;
    const idx = entry.notes.findIndex((n) => n.id === note.id);
    const newNote = Note.reconstitute(note.toData());
    if (idx >= 0) {
      entry.notes[idx] = newNote;
    } else {
      entry.notes.push(newNote);
    }
  }

  async delete(id: UUID): Promise<void> {
    this.chains.delete(id);
  }

  async findTimelinePage(query: TimelinePageQuery): Promise<TimelinePageResult> {
    const selectedIds = new Set(query.chainIds);
    if (selectedIds.size === 0) return { entries: [], total: 0 };

    const chains = await this.findAll({ deleted: false, archived: false });
    const normalizedText = query.text ? normalizeText(query.text) : '';
    const fromTs = query.from ? new Date(query.from).getTime() : null;
    const toTs = query.to ? new Date(query.to).getTime() : null;
    const tagChainIds = new Set(query.tagChainIds ?? []);
    const tagNoteIds = new Set(query.tagNoteIds ?? []);
    const hasTagFilter = tagChainIds.size > 0 || tagNoteIds.size > 0;
    const offset = Math.max(0, query.offset);
    const limit = Math.max(1, query.limit);

    const matching = chains
      .filter((chain) => selectedIds.has(chain.id))
      .flatMap((chain) =>
        chain.notes
          .map((note) => note.toData())
          .filter((note) => {
            const noteTs = new Date(note.createdAt).getTime();
            const inRange =
              (fromTs === null || noteTs >= fromTs) &&
              (toTs === null || noteTs <= toTs);
            const matchesText =
              !normalizedText ||
              normalizeText(`${note.content} ${note.title ?? ''} ${chain.displayTitle}`).includes(
                normalizedText
              );
            const matchesTag =
              !hasTagFilter ||
              tagChainIds.has(note.chainId) ||
              tagNoteIds.has(note.id);
            return inRange && matchesText && matchesTag;
          })
          .map((note) => ({
            note,
            chainId: chain.id,
            chainTitle: chain.displayTitle,
            tiebreaker: `${chain.id}:${note.id}`,
          }))
      )
      .sort((a, b) => {
        const dateDiff = a.note.createdAt.localeCompare(b.note.createdAt);
        return dateDiff !== 0 ? dateDiff : a.note.id.localeCompare(b.note.id);
      });

    return {
      entries: matching.slice(offset, offset + limit),
      total: matching.length,
    };
  }

  async countByTagId(_tagId: UUID): Promise<number> {
    return 0;
  }

  clear(): void {
    this.chains.clear();
  }
}
