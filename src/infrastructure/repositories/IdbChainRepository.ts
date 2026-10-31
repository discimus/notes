import type { IDBPDatabase } from 'idb';
import type { ThreadNotesDB } from '../persistence/schema.js';
import { getDatabase } from '../persistence/schema.js';
import { Chain, Note } from '../../domain/entities/index.js';
import type { IChainRepository, ChainSortOrder, ChainFilter } from '../../domain/repositories/index.js';
import type { UUID } from '../../shared/types/index.js';
import { normalizeText } from '../../shared/utilities/index.js';

export class IdbChainRepository implements IChainRepository {
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

    if (filter.favorite === true) {
      filtered = filtered.filter((c) => c.isFavorite && !c.deletedAt);
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

  async countByTagId(tagId: UUID): Promise<number> {
    const db = await this.db();
    const chainTags = await db.getAllFromIndex('chainTags', 'by-tagId', tagId);
    return chainTags.length;
  }
}
