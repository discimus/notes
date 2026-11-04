import type { UUID, ISODateString } from '@shared/types/index.js';
import { ValidationError } from '@shared/types/index.js';
import { NotePosition } from '../value-objects/index.js';
import {
  buildNoteFileName,
  generateId,
  now,
  uniqueFileName,
} from '@shared/utilities/index.js';

export type NoteRole = 'header' | 'tail';
export type NoteContentType = 'text' | 'code' | 'markdown';

function fileExtension(contentType: NoteContentType): string {
  return contentType === 'markdown' ? 'md' : 'txt';
}

function automaticFileName(
  content: string,
  contentType: NoteContentType,
  timestamp: ISODateString
): string {
  return buildNoteFileName({
    content,
    extension: fileExtension(contentType),
    timestamp: new Date(timestamp),
  });
}

export interface NoteData {
  id: UUID;
  content: string;
  chainId: UUID;
  position: number;
  role: NoteRole;
  contentType?: NoteContentType | undefined;
  title?: string | undefined;
  contentHash?: string | undefined;
  sourceFileName?: string | undefined;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

function normalizedContent(content: string, contentType: NoteContentType): string {
  return contentType === 'text' ? content.trim() : content;
}

/**
 * Entidade: Note.
 * Toda nota pertence a exatamente uma coleção.
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
  private _contentHash: string | undefined;
  private _sourceFileName: string | undefined;
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
    this._contentHash = data.contentHash;
    this._sourceFileName = data.sourceFileName;
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
    const content = normalizedContent(params.content, contentType);
    const ts = now();
    return new Note({
      id: generateId(),
      content,
      chainId: params.chainId,
      position: 0,
      role: 'header',
      contentType,
      ...(params.title?.trim() ? { title: params.title.trim() } : {}),
      sourceFileName: automaticFileName(content, contentType, ts),
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
    contentHash?: string;
    sourceFileName?: string;
  }): Note {
    if (!params.content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    if (params.position <= 0) {
      throw new ValidationError('A posição de uma tail deve ser maior que 0.');
    }
    const contentType = params.contentType ?? 'text';
    const content = normalizedContent(params.content, contentType);
    const ts = params.createdAt ?? now();
    return new Note({
      id: generateId(),
      content,
      chainId: params.chainId,
      position: params.position,
      role: 'tail',
      contentType,
      ...(params.contentHash ? { contentHash: params.contentHash } : {}),
      sourceFileName:
        params.sourceFileName ?? automaticFileName(content, contentType, ts),
      createdAt: ts,
      updatedAt: ts,
    });
  }

  /** Cria uma tail sem texto para hospedar anexos. */
  static createAttachmentTail(params: {
    chainId: UUID;
    position: number;
  }): Note {
    if (params.position <= 0) {
      throw new ValidationError('A posição de uma tail deve ser maior que 0.');
    }
    const ts = now();
    return new Note({
      id: generateId(),
      content: '',
      chainId: params.chainId,
      position: params.position,
      role: 'tail',
      contentType: 'text',
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

  moveTo(chainId: UUID, position: number, role: NoteRole = 'tail'): Note {
    if (position <= 0) {
      throw new ValidationError('A posição de uma nota movida deve ser maior que 0.');
    }
    return Note.reconstitute({
      ...this.toData(),
      chainId,
      position,
      role,
      updatedAt: now(),
    });
  }

  get id(): UUID { return this._id; }
  get content(): string { return this._content; }
  get chainId(): UUID { return this._chainId; }
  get position(): NotePosition { return this._position; }
  get role(): NoteRole { return this._role; }
  get contentType(): NoteContentType { return this._contentType; }
  get title(): string | undefined { return this._title; }
  get contentHash(): string | undefined { return this._contentHash; }
  get sourceFileName(): string | undefined { return this._sourceFileName; }
  get createdAt(): ISODateString { return this._createdAt; }
  get updatedAt(): ISODateString { return this._updatedAt; }

  isHeader(): boolean {
    return this._role === 'header';
  }

  updateContent(content: string, contentType: NoteContentType = this._contentType): void {
    if (!content.trim()) {
      throw new ValidationError('O conteúdo da nota não pode ser vazio.');
    }
    const generatedName = automaticFileName(
      this._content,
      this._contentType,
      this._createdAt
    );
    const nextContent = normalizedContent(content, contentType);

    if (this._sourceFileName === generatedName) {
      this._sourceFileName = automaticFileName(
        nextContent,
        contentType,
        this._createdAt
      );
    }

    this._content = nextContent;
    this._contentType = contentType;
    this._contentHash = undefined;
    this._updatedAt = now();
  }

  updateContentType(contentType: NoteContentType): void {
    if (this._contentType === contentType) return;

    const generatedName = automaticFileName(
      this._content,
      this._contentType,
      this._createdAt
    );
    if (this._sourceFileName === generatedName) {
      this._sourceFileName = automaticFileName(
        this._content,
        contentType,
        this._createdAt
      );
    }

    this._contentType = contentType;
    this._updatedAt = now();
  }

  updateTitle(title: string | undefined): void {
    this._title = title?.trim() || undefined;
    this._updatedAt = now();
  }

  renameSourceFileName(fileName: string, existingNames: ReadonlySet<string>): void {
    const trimmed = fileName.trim();
    if (!trimmed) {
      throw new ValidationError('O nome do arquivo não pode ser vazio.');
    }
    this._sourceFileName = uniqueFileName(trimmed.normalize('NFC'), existingNames);
    this._updatedAt = now();
  }

  ensureUniqueSourceFileName(existingNames: ReadonlySet<string>): void {
    if (!this._sourceFileName) return;
    this._sourceFileName = uniqueFileName(this._sourceFileName, existingNames);
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
      ...(this._contentHash ? { contentHash: this._contentHash } : {}),
      ...(this._sourceFileName ? { sourceFileName: this._sourceFileName } : {}),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
