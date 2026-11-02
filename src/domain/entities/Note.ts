import type { UUID, ISODateString } from '@shared/types/index.js';
import { ValidationError } from '@shared/types/index.js';
import { NotePosition } from '../value-objects/index.js';
import { generateId, now } from '@shared/utilities/index.js';

export type NoteRole = 'header' | 'tail';
export type NoteContentType = 'text' | 'code' | 'markdown';

export interface NoteData {
  id: UUID;
  content: string;
  chainId: UUID;
  position: number;
  role: NoteRole;
  contentType?: NoteContentType | undefined;
  title?: string | undefined;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

function normalizedContent(content: string, contentType: NoteContentType): string {
  return contentType === 'text' ? content.trim() : content;
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
  private _contentType: NoteContentType;
  private _title: string | undefined;
  private readonly _createdAt: ISODateString;
  private _updatedAt: ISODateString;

  private constructor(data: NoteData) {
    this._id = data.id;
    this._content = data.content;
    this._chainId = data.chainId;
    this._position = NotePosition.of(data.position);
    this._role = data.role;
    this._contentType = data.contentType ?? 'text';
    this._title = data.title;
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }

  /** Cria um header (posição 0) */
  static createHeader(params: {
    content: string;
    chainId: UUID;
    contentType?: NoteContentType;
    title?: string;
  }): Note {
    if (!params.content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    const contentType = params.contentType ?? 'text';
    const ts = now();
    return new Note({
      id: generateId(),
      content: normalizedContent(params.content, contentType),
      chainId: params.chainId,
      position: 0,
      role: 'header',
      contentType,
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
    contentType?: NoteContentType;
    createdAt?: ISODateString;
  }): Note {
    if (!params.content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    if (params.position <= 0) {
      throw new ValidationError('A posição de uma tail deve ser maior que 0.');
    }
    const contentType = params.contentType ?? 'text';
    const ts = params.createdAt ?? now();
    return new Note({
      id: generateId(),
      content: normalizedContent(params.content, contentType),
      chainId: params.chainId,
      position: params.position,
      role: 'tail',
      contentType,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  static reconstitute(data: NoteData): Note {
    return new Note(data);
  }

  withPosition(position: number): Note {
    return Note.reconstitute({ ...this.toData(), position });
  }

  get id(): UUID { return this._id; }
  get content(): string { return this._content; }
  get chainId(): UUID { return this._chainId; }
  get position(): NotePosition { return this._position; }
  get role(): NoteRole { return this._role; }
  get contentType(): NoteContentType { return this._contentType; }
  get title(): string | undefined { return this._title; }
  get createdAt(): ISODateString { return this._createdAt; }
  get updatedAt(): ISODateString { return this._updatedAt; }

  isHeader(): boolean {
    return this._role === 'header';
  }

  updateContent(content: string, contentType: NoteContentType = this._contentType): void {
    if (!content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    this._content = normalizedContent(content, contentType);
    this._contentType = contentType;
    this._updatedAt = now();
  }

  updateContentType(contentType: NoteContentType): void {
    if (this._contentType === contentType) return;
    this._contentType = contentType;
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
      contentType: this._contentType,
      ...(this._title ? { title: this._title } : {}),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
