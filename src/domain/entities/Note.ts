import type { UUID, ISODateString } from '@shared/types/index.js';
import { ValidationError } from '@shared/types/index.js';
import { NotePosition } from '../value-objects/index.js';
import { generateId, now } from '@shared/utilities/index.js';

export type NoteRole = 'header' | 'tail';

export interface NoteData {
  id: UUID;
  content: string;
  chainId: UUID;
  position: number;
  role: NoteRole;
  title?: string | undefined;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Entidade: Note.
 * Toda nota pertence a exatamente uma cadeia.
 * A posição é imutável após criação para preservar a ordem determinística.
 */
export class Note {
  private readonly _id: UUID;
  private _content: string;
  private readonly _chainId: UUID;
  private readonly _position: NotePosition;
  private readonly _role: NoteRole;
  private _title: string | undefined;
  private readonly _createdAt: ISODateString;
  private _updatedAt: ISODateString;

  private constructor(data: NoteData) {
    this._id = data.id;
    this._content = data.content;
    this._chainId = data.chainId;
    this._position = NotePosition.of(data.position);
    this._role = data.role;
    this._title = data.title;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  /** Cria um header (posição 0) */
  static createHeader(params: {
    content: string;
    chainId: UUID;
    title?: string;
  }): Note {
    if (!params.content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    const ts = now();
    return new Note({
      id: generateId(),
      content: params.content.trim(),
      chainId: params.chainId,
      position: 0,
      role: 'header',
      ...(params.title?.trim() ? { title: params.title.trim() } : {}),
      createdAt: ts,
      updatedAt: ts,
    });
  }

  /** Cria uma tail na posição especificada */
  static createTail(params: {
    content: string;
    chainId: UUID;
    position: number;
  }): Note {
    if (!params.content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    if (params.position <= 0) {
      throw new ValidationError('A posição de uma tail deve ser maior que 0.');
    }
    const ts = now();
    return new Note({
      id: generateId(),
      content: params.content.trim(),
      chainId: params.chainId,
      position: params.position,
      role: 'tail',
      createdAt: ts,
      updatedAt: ts,
    });
  }

  static reconstitute(data: NoteData): Note {
    return new Note(data);
  }

  get id(): UUID { return this._id; }
  get content(): string { return this._content; }
  get chainId(): UUID { return this._chainId; }
  get position(): NotePosition { return this._position; }
  get role(): NoteRole { return this._role; }
  get title(): string | undefined { return this._title; }
  get createdAt(): ISODateString { return this._createdAt; }
  get updatedAt(): ISODateString { return this._updatedAt; }

  isHeader(): boolean {
    return this._role === 'header';
  }

  updateContent(content: string): void {
    if (!content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    this._content = content.trim();
    this._updatedAt = now();
  }

  updateTitle(title: string | undefined): void {
    this._title = title?.trim() || undefined;
    this._updatedAt = now();
  }

  toData(): NoteData {
    return {
      id: this._id,
      content: this._content,
      chainId: this._chainId,
      position: this._position.value,
      role: this._role,
      ...(this._title ? { title: this._title } : {}),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
