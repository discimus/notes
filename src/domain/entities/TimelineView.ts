import type { UUID, ISODateString } from '@shared/types/index.js';
import type { NoteData } from './Note.js';
import { compareDates, now } from '@shared/utilities/index.js';

export interface TimelineEntry {
  note: NoteData;
  chainId: UUID;
  chainTitle: string;
  /** Para desempate determinístico quando timestamps são iguais */
  tiebreaker: string;
}

export interface TimelineFilter {
  chainIds: UUID[];
  from?: ISODateString | undefined;
  to?: ISODateString | undefined;
}

/**
 * Modelo de leitura: TimelineView.
 * Representa notas de múltiplas cadeias ordenadas cronologicamente.
 * Não altera estruturas originais — operação de leitura apenas.
 */
export class TimelineView {
  private readonly _entries: TimelineEntry[];
  private readonly _filter: TimelineFilter;
  private readonly _createdAt: ISODateString;

  private constructor(entries: TimelineEntry[], filter: TimelineFilter) {
    this._entries = entries;
    this._filter = filter;
    this._createdAt = now();
  }

  /**
   * Cria uma visualização cronológica a partir de entradas brutas.
   * Critério de ordenação:
   *   1. createdAt (ascendente)
   *   2. tiebreaker = chainId + noteId (determinístico)
   */
  static create(entries: TimelineEntry[], filter: TimelineFilter): TimelineView {
    const sorted = [...entries].sort((a, b) => {
      const dateDiff = compareDates(a.note.createdAt, b.note.createdAt);
      if (dateDiff !== 0) return dateDiff;
      // Desempate determinístico
      return a.tiebreaker.localeCompare(b.tiebreaker);
    });

    return new TimelineView(sorted, filter);
  }

  get entries(): readonly TimelineEntry[] {
    return this._entries;
  }

  get filter(): TimelineFilter {
    return this._filter;
  }

  get createdAt(): ISODateString {
    return this._createdAt;
  }

  get isEmpty(): boolean {
    return this._entries.length === 0;
  }

  /** Filtra por intervalo temporal */
  filterByRange(from?: ISODateString, to?: ISODateString): TimelineView {
    const filtered = this._entries.filter((e) => {
      const ts = new Date(e.note.createdAt).getTime();
      if (from && ts < new Date(from).getTime()) return false;
      if (to && ts > new Date(to).getTime()) return false;
      return true;
    });
    return new TimelineView(filtered, {
      ...this._filter,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }
}
