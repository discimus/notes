import { Chain, Note } from '@domain/entities/index.js';
import type { IChainRepository, ChainSortOrder, ChainFilter } from '@domain/repositories/index.js';
import type { UUID } from '@shared/types/index.js';
import { normalizeText } from '@shared/utilities/index.js';

/**
 * Repositório em memória para testes unitários e de integração.
 */
export class InMemoryChainRepository implements IChainRepository {
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
    if (filter.favorite === true) result = result.filter((c) => c.isFavorite);

    if (filter.search) {
      const q = normalizeText(filter.search);
      result = result.filter((c) =>
        c.notes.some((n) => normalizeText(n.content).includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async save(chain: Chain, notes: Note[]): Promise<void> {
    this.chains.set(chain.id, {
      chain: Chain.reconstitute(chain.toData(), notes.map((n) => Note.reconstitute(n.toData()))),
      notes: notes.map((n) => Note.reconstitute(n.toData())),
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

  async countByTagId(_tagId: UUID): Promise<number> {
    return 0;
  }

  clear(): void {
    this.chains.clear();
  }
}
