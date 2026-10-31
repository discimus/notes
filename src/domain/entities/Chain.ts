import type { UUID, ISODateString } from '@shared/types/index.js';
import { InvariantViolationError, ValidationError } from '@shared/types/index.js';
import { Note } from './Note.js';
import { generateId, now } from '@shared/utilities/index.js';

export interface ChainData {
  id: UUID;
  headerNoteId: UUID;
  title?: string | undefined;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archivedAt?: ISODateString | undefined;
  isFavorite: boolean;
  deletedAt?: ISODateString | undefined;
}

/**
 * Agregado: Chain.
 * Responsável por manter a integridade de suas notas.
 *
 * Invariantes:
 * 1. Toda cadeia possui exatamente um header.
 * 2. Uma cadeia não pode possuir mais de um header.
 * 3. A criação de uma cadeia exige um header válido.
 * 4. Notas têm ordem determinística por posição.
 * 5. Tails são sempre adicionadas ao final.
 */
export class Chain {
  private readonly _id: UUID;
  private readonly _headerNoteId: UUID;
  private _title: string | undefined;
  private readonly _createdAt: ISODateString;
  private _updatedAt: ISODateString;
  private _archivedAt: ISODateString | undefined;
  private _isFavorite: boolean;
  private _deletedAt: ISODateString | undefined;

  // Notas em memória (carregadas pelo repositório)
  private _notes: Note[] = [];

  private constructor(data: ChainData) {
    this._id = data.id;
    this._headerNoteId = data.headerNoteId;
    this._title = data.title;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
    this._archivedAt = data.archivedAt;
    this._isFavorite = data.isFavorite;
    this._deletedAt = data.deletedAt;
  }

  /**
   * Cria uma nova cadeia com seu header.
   * Retorna o Chain e a Note (header) para persistência.
   */
  static createWithHeader(params: {
    content: string;
    title?: string;
  }): { chain: Chain; header: Note } {
    if (!params.content.trim()) {
      throw new ValidationError('O conteúdo do header não pode ser vazio.');
    }

    const chainId = generateId();
    const ts = now();

    const header = Note.createHeader({
      content: params.content,
      chainId,
      ...(params.title ? { title: params.title } : {}),
    });

    const chain = new Chain({
      id: chainId,
      headerNoteId: header.id,
      ...(params.title ? { title: params.title.trim() } : {}),
      createdAt: ts,
      updatedAt: ts,
      isFavorite: false,
    });

    chain._notes = [header];
    return { chain, header };
  }

  static reconstitute(data: ChainData, notes: Note[] = []): Chain {
    const chain = new Chain(data);
    // Valida que existe exatamente um header
    const headers = notes.filter((n) => n.isHeader());
    if (notes.length > 0 && headers.length !== 1) {
      throw new InvariantViolationError(
        `Cadeia ${data.id} deve ter exatamente um header, mas tem ${headers.length}.`
      );
    }
    chain._notes = [...notes].sort((a, b) => a.position.compareTo(b.position));
    return chain;
  }

  get id(): UUID { return this._id; }
  get headerNoteId(): UUID { return this._headerNoteId; }
  get title(): string | undefined { return this._title; }
  get createdAt(): ISODateString { return this._createdAt; }
  get updatedAt(): ISODateString { return this._updatedAt; }
  get archivedAt(): ISODateString | undefined { return this._archivedAt; }
  get isFavorite(): boolean { return this._isFavorite; }
  get deletedAt(): ISODateString | undefined { return this._deletedAt; }
  get notes(): readonly Note[] { return this._notes; }

  get header(): Note {
    const h = this._notes.find((n) => n.isHeader());
    if (!h) {
      throw new InvariantViolationError(`Cadeia ${this._id} não possui header carregado.`);
    }
    return h;
  }

  get noteCount(): number { return this._notes.length; }

  isArchived(): boolean { return this._archivedAt !== undefined; }
  isDeleted(): boolean { return this._deletedAt !== undefined; }

  /**
   * Operação central: anexa uma nota ao final da cadeia.
   * Garante posição correta e atualiza o timestamp da cadeia.
   */
  appendNote(content: string): Note {
    if (this.isArchived()) {
      throw new InvariantViolationError('Não é possível adicionar notas a uma cadeia arquivada.');
    }
    if (this.isDeleted()) {
      throw new InvariantViolationError('Não é possível adicionar notas a uma cadeia excluída.');
    }

    const nextPosition = this._notes.length; // header = 0, first tail = 1, etc.
    const tail = Note.createTail({
      content,
      chainId: this._id,
      position: nextPosition,
    });

    this._notes.push(tail);
    this._updatedAt = now();
    return tail;
  }

  updateTitle(title: string | undefined): void {
    this._title = title?.trim() || undefined;
    this._updatedAt = now();
    // Se o header estiver carregado, sincroniza o título
    const h = this._notes.find((n) => n.isHeader());
    if (h) {
      h.updateTitle(title);
    }
  }

  toggleFavorite(): void {
    this._isFavorite = !this._isFavorite;
    this._updatedAt = now();
  }

  archive(): void {
    if (this.isDeleted()) {
      throw new InvariantViolationError('Não é possível arquivar uma cadeia excluída.');
    }
    this._archivedAt = now();
    this._updatedAt = now();
  }

  restore(): void {
    this._archivedAt = undefined;
    this._updatedAt = now();
  }

  softDelete(): void {
    if (this.isArchived()) {
      throw new InvariantViolationError(
        'Não é possível mover uma cadeia arquivada para a lixeira. Restaure-a antes.'
      );
    }
    this._deletedAt = now();
    this._updatedAt = now();
  }

  hardRestore(): void {
    this._deletedAt = undefined;
    this._updatedAt = now();
  }

  /** Rótulo de exibição: título explícito ou prévia do header */
  get displayTitle(): string {
    if (this._title) return this._title;
    const h = this._notes.find((n) => n.isHeader());
    if (h?.title) return h.title;
    if (h) {
      const preview = h.content.slice(0, 60).trim();
      return preview.length < h.content.trim().length ? preview + '…' : preview;
    }
    return 'Sem título';
  }

  toData(): ChainData {
    return {
      id: this._id,
      headerNoteId: this._headerNoteId,
      ...(this._title ? { title: this._title } : {}),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      ...(this._archivedAt ? { archivedAt: this._archivedAt } : {}),
      isFavorite: this._isFavorite,
      ...(this._deletedAt ? { deletedAt: this._deletedAt } : {}),
    };
  }
}
