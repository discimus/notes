import type { IDBPDatabase } from 'idb';
import type { ThreadNotesDB } from '../persistence/schema.js';
import { getDatabase } from '../persistence/schema.js';
import { Chain, Note } from '@domain/entities/index.js';
import type { TimelineEntry } from '@domain/entities/index.js';
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

export class IdbChainRepository implements IChainRepository, ITimelineQueryRepository {
  private async db(): Promise<IDBPDatabase<ThreadNotesDB>> {
    return getDatabase();
  }

  async findById(id: UUID): Promise<Chain | null> {
    const db = await this.db();
    const chainData = await db.get('chains', id);
    if (!chainData) return null;

    const notesData = await db.getAllFromIndex('notes', 'by-chainId', id);
    const notes = notesData
      .map((n) => Note.reconstitute(n))
      .sort((a, b) => a.position.compareTo(b.position));

    return Chain.reconstitute(chainData, notes);
  }

  async findAll(filter: ChainFilter = {}, sort: ChainSortOrder = 'updatedAt'): Promise<Chain[]> {
    const db = await this.db();
    const allChains = await db.getAll('chains');

    let filtered = allChains;

    // Filtros
    if (filter.deleted === false) {
      filtered = filtered.filter((c) => !c.deletedAt);
    } else if (filter.deleted === true) {
      filtered = filtered.filter((c) => !!c.deletedAt);
    }

    if (filter.archived === false) {
      filtered = filtered.filter((c) => !c.archivedAt);
    } else if (filter.archived === true) {
      filtered = filtered.filter((c) => !!c.archivedAt && !c.deletedAt);
    }

    // Filtro por tags
    if (filter.tagIds && filter.tagIds.length > 0) {
      const tagIds = filter.tagIds;
      const chainIdsWithTags = new Set<string>();
      for (const tagId of tagIds) {
        const chainTags = await db.getAllFromIndex('chainTags', 'by-tagId', tagId);
        chainTags.forEach((ct) => chainIdsWithTags.add(ct.chainId));
      }
      filtered = filtered.filter((c) => chainIdsWithTags.has(c.id));
    }

    // Filtro por texto
    if (filter.search) {
      const query = normalizeText(filter.search);
      const chainsWithText = new Set<string>();

      for (const c of filtered) {
        const titleMatch = c.title ? normalizeText(c.title).includes(query) : false;
        if (titleMatch) {
          chainsWithText.add(c.id);
          continue;
        }
        // Busca nas notas
        const notes = await db.getAllFromIndex('notes', 'by-chainId', c.id);
        const noteMatch = notes.some(
          (n) => normalizeText(n.content).includes(query) || (n.title && normalizeText(n.title).includes(query))
        );
        if (noteMatch) chainsWithText.add(c.id);
      }
      filtered = filtered.filter((c) => chainsWithText.has(c.id));
    }

    // Ordenação
    filtered.sort((a, b) => {
      if (sort === 'title') {
        return (a.title ?? '').localeCompare(b.title ?? '');
      }
      const dateA = sort === 'createdAt' ? a.createdAt : a.updatedAt;
      const dateB = sort === 'createdAt' ? b.createdAt : b.updatedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Reconstitui com notas
    return Promise.all(
      filtered.map(async (chainData) => {
        const notesData = await db.getAllFromIndex('notes', 'by-chainId', chainData.id);
        const notes = notesData
          .map((n) => Note.reconstitute(n))
          .sort((a, b) => a.position.compareTo(b.position));
        return Chain.reconstitute(chainData, notes);
      })
    );
  }

  async save(chain: Chain, notes: Note[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['chains', 'notes'], 'readwrite');
    await tx.objectStore('chains').put(chain.toData());
    for (const note of notes) {
      await tx.objectStore('notes').put(note.toData());
    }
    await tx.done;
  }

  async saveChainOnly(chain: Chain): Promise<void> {
    const db = await this.db();
    await db.put('chains', chain.toData());
  }

  async saveNote(note: Note): Promise<void> {
    const db = await this.db();
    await db.put('notes', note.toData());
  }

  async delete(id: UUID): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['chains', 'notes', 'chainTags'], 'readwrite');
    await tx.objectStore('chains').delete(id);

    // Remove notas
    const notes = await tx.objectStore('notes').index('by-chainId').getAllKeys(id);
    for (const key of notes) {
      await tx.objectStore('notes').delete(key);
    }

    // Remove chainTags
    const chainTags = await tx.objectStore('chainTags').index('by-chainId').getAll(id);
    for (const ct of chainTags) {
      await tx.objectStore('chainTags').delete([ct.chainId, ct.tagId]);
    }

    await tx.done;
  }

  async findTimelinePage(query: TimelinePageQuery): Promise<TimelinePageResult> {
    const db = await this.db();
    const selectedIds = new Set(query.chainIds);
    if (selectedIds.size === 0) return { entries: [], total: 0 };

    const allChains = await db.getAll('chains');
    const activeChains = allChains.filter(
      (chain) => selectedIds.has(chain.id) && !chain.deletedAt && !chain.archivedAt
    );

    if (activeChains.length === 0) return { entries: [], total: 0 };

    const chainTitles = new Map<string, string>();
    await Promise.all(
      activeChains.map(async (chain) => {
        const header = await db.get('notes', chain.headerNoteId);
        const title = chain.title ?? header?.title ?? header?.content.split(/\r?\n/)[0] ?? 'Cadeia';
        chainTitles.set(chain.id, title);
      })
    );

    const normalizedText = query.text ? normalizeText(query.text) : '';
    const fromTs = query.from ? new Date(query.from).getTime() : null;
    const toTs = query.to ? new Date(query.to).getTime() : null;
    const offset = Math.max(0, query.offset);
    const limit = Math.max(1, query.limit);
    const entries: TimelineEntry[] = [];
    let total = 0;

    const tx = db.transaction('notes');
    let cursor = await tx.store.index('by-createdAt').openCursor();

    while (cursor) {
      const note = cursor.value;
      const chainTitle = chainTitles.get(note.chainId);

      if (chainTitle) {
        const noteTs = new Date(note.createdAt).getTime();
        const inRange = (fromTs === null || noteTs >= fromTs) && (toTs === null || noteTs <= toTs);
        const matchesText =
          !normalizedText ||
          normalizeText(`${note.content} ${note.title ?? ''} ${chainTitle}`).includes(normalizedText);

        if (inRange && matchesText) {
          if (total >= offset && entries.length < limit) {
            entries.push({
              note,
              chainId: note.chainId,
              chainTitle,
              tiebreaker: `${note.chainId}:${note.id}`,
            });
          }
          total += 1;
        }
      }

      cursor = await cursor.continue();
    }

    await tx.done;
    return { entries, total };
  }

  async countByTagId(tagId: UUID): Promise<number> {
    const db = await this.db();
    const chainTags = await db.getAllFromIndex('chainTags', 'by-tagId', tagId);
    return chainTags.length;
  }
}
