import type { UUID, ISODateString } from '@shared/types/index.js';
import { InvariantViolationError, ValidationError } from '@shared/types/index.js';
import { Note } from './Note.js';
import type { NoteContentType } from './Note.js';
import { generateId, now } from '@shared/utilities/index.js';

export interface ChainData {
  id: UUID;
  headerNoteId?: UUID | undefined;
  title?: string | undefined;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  archivedAt?: ISODateString | undefined;
  deletedAt?: ISODateString | undefined;
}

/**
 * Agregado: Chain.
 * ResponsÃ¡vel por manter a integridade de suas notas.
 *
 * Invariantes:
 * 1. Coleções com headerNoteId possuem exatamente um header correspondente.
 * 2. Coleções criadas apenas com título são headerless.
 * 3. Coleções headerless aceitam apenas tails, começando na posição 1.
 * 4. Notas têm ordem determinística por posição.
 * 5. Tails são sempre adicionadas ao final.
 */
export class Chain {
  private readonly _id: UUID;
  private _headerNoteId: UUID | undefined;
  private _title: string | undefined;
  private readonly _createdAt: ISODateString;
  private _updatedAt: ISODateString;
  private _archivedAt: ISODateString | undefined;
  private _deletedAt: ISODateString | undefined;

  // Notas em memÃ³ria (carregadas pelo repositÃ³rio)
  private _notes: Note[] = [];

  private constructor(data: ChainData) {
    this._id = data.id;
    this._headerNoteId = data.headerNoteId;
    this._title = data.title;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
    this._archivedAt = data.archivedAt;
    this._deletedAt = data.deletedAt;
  }

  static create(params: { title: string }): Chain {
    const title = params.title.trim();
    if (!title) {
      throw new ValidationError('O título da coleção não pode ser vazio.');
    }

    const ts = now();
    return new Chain({
      id: generateId(),
      title,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  /**
   * Cria uma nova coleção com seu header.
   * Retorna o Chain e a Note (header) para persistA�ncia.
   */
  static createWithHeader(params: {
    content: string;
    contentType?: NoteContentType;
    title?: string;
  }): { chain: Chain; header: Note } {
    if (!params.content.trim()) {
      throw new ValidationError('O conteÃºdo do header nÃ£o pode ser vazio.');
    }

    const chainId = generateId();
    const ts = now();

    const header = Note.createHeader({
      content: params.content,
      chainId,
      ...(params.contentType ? { contentType: params.contentType } : {}),
      ...(params.title ? { title: params.title } : {}),
    });

    const chain = new Chain({
      id: chainId,
      headerNoteId: header.id,
      ...(params.title ? { title: params.title.trim() } : {}),
      createdAt: ts,
      updatedAt: ts,
    });

    chain._notes = [header];
    return { chain, header };
  }

  static reconstitute(data: ChainData, notes: Note[] = []): Chain {
    const chain = new Chain(data);
    const headers = notes.filter((n) => n.isHeader());

    if (data.headerNoteId) {
      if (headers.length !== 1 || headers[0]?.id !== data.headerNoteId) {
        throw new InvariantViolationError(
          `Coleção ${data.id} deve ter exatamente um header correspondente ao headerNoteId.`
        );
      }
    } else if (headers.length > 0) {
      throw new InvariantViolationError(
        `Coleção ${data.id} possui header sem headerNoteId.`
      );
    }

    chain._notes = [...notes].sort((a, b) => a.position.compareTo(b.position));
    return chain;
  }

  get id(): UUID { return this._id; }
  get headerNoteId(): UUID | undefined { return this._headerNoteId; }
  get title(): string | undefined { return this._title; }
  get createdAt(): ISODateString { return this._createdAt; }
  get updatedAt(): ISODateString { return this._updatedAt; }
  get archivedAt(): ISODateString | undefined { return this._archivedAt; }
  get deletedAt(): ISODateString | undefined { return this._deletedAt; }
  get notes(): readonly Note[] { return this._notes; }

  get header(): Note {
    const h = this._notes.find((n) => n.isHeader());
    if (!h) {
      throw new InvariantViolationError(`Coleção ${this._id} nÃ£o possui header carregado.`);
    }
    return h;
  }

  get noteCount(): number { return this._notes.length; }

  isArchived(): boolean { return this._archivedAt !== undefined; }
  isDeleted(): boolean { return this._deletedAt !== undefined; }

  /**
   * OperaÃ§Ã£o central: anexa uma nota ao final da coleção.
   * Garante posiÃ§Ã£o correta e atualiza o timestamp da coleção.
   */
  appendNote(content: string, contentType?: NoteContentType): Note {
    return this.appendNoteInternal(content, contentType);
  }

  appendImportedText(
    content: string,
    createdAt?: ISODateString,
    metadata?: { contentHash?: string; sourceFileName?: string }
  ): Note {
    return this.appendNoteInternal(content, 'text', createdAt, metadata);
  }

  private appendNoteInternal(
    content: string,
    contentType?: NoteContentType,
    createdAt?: ISODateString,
    metadata?: { contentHash?: string; sourceFileName?: string }
  ): Note {
    if (this.isArchived()) {
      throw new InvariantViolationError('NÃ£o Ã© possÃ­vel adicionar notas a uma coleção arquivada.');
    }
    if (this.isDeleted()) {
      throw new InvariantViolationError('NÃ£o Ã© possÃ­vel adicionar notas a uma coleção excluÃ­da.');
    }

    const nextPosition = this._headerNoteId
      ? this._notes.length
      : this._notes.length + 1;
    const tail = Note.createTail({
      content,
      chainId: this._id,
      position: nextPosition,
      ...(contentType ? { contentType } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(metadata?.contentHash ? { contentHash: metadata.contentHash } : {}),
      ...(metadata?.sourceFileName
        ? { sourceFileName: metadata.sourceFileName }
        : {}),
    });

    const fileNames = new Set(
      this._notes
        .map((note) => note.sourceFileName)
        .filter((name): name is string => Boolean(name))
    );
    tail.ensureUniqueSourceFileName(fileNames);

    this._notes.push(tail);
    this._updatedAt = now();
    return tail;
  }

  removeNote(noteId: UUID): Note {
    const index = this._notes.findIndex((note) => note.id === noteId);
    if (index < 0) {
      throw new InvariantViolationError(
        `A nota ${noteId} não pertence à coleção ${this._id}.`
      );
    }

    const [removed] = this._notes.splice(index, 1);
    if (!removed) {
      throw new InvariantViolationError(`Não foi possível remover a nota ${noteId}.`);
    }

    if (removed.isHeader()) {
      this._headerNoteId = undefined;
    }

    const firstPosition = this._headerNoteId ? 0 : 1;
    this._notes = this._notes.map((note, noteIndex) =>
      note.withPosition(firstPosition + noteIndex)
    );
    this._updatedAt = now();
    return removed;
  }

  updateTitle(title: string | undefined): void {
    this._title = title?.trim() || undefined;
    this._updatedAt = now();
    // Se o header estiver carregado, sincroniza o tÃ­tulo
    const h = this._notes.find((n) => n.isHeader());
    if (h) {
      h.updateTitle(title);
    }
  }

  archive(): void {
    if (this.isDeleted()) {
      throw new InvariantViolationError('NÃ£o Ã© possÃ­vel arquivar uma coleção excluÃ­da.');
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
        'NÃ£o Ã© possÃ­vel mover uma coleção arquivada para a lixeira. Restaure-a antes.'
      );
    }
    this._deletedAt = now();
    this._updatedAt = now();
  }

  hardRestore(): void {
    this._deletedAt = undefined;
    this._updatedAt = now();
  }

  /** RÃ³tulo de exibiÃ§Ã£o: tÃ­tulo explÃ­cito ou prÃ©via do header */
  get displayTitle(): string {
    if (this._title) return this._title;
    const h = this._notes.find((n) => n.isHeader());
    if (h?.title) return h.title;
    if (h) {
      const preview = h.content.slice(0, 60).trim();
      return preview.length < h.content.trim().length ? preview + 'â€¦' : preview;
    }
    return 'Sem tÃ­tulo';
  }

  toData(): ChainData {
    return {
      id: this._id,
      ...(this._headerNoteId ? { headerNoteId: this._headerNoteId } : {}),
      ...(this._title ? { title: this._title } : {}),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      ...(this._archivedAt ? { archivedAt: this._archivedAt } : {}),
      ...(this._deletedAt ? { deletedAt: this._deletedAt } : {}),
    };
  }
}
