import type { ISODateString, UUID } from '@shared/types/index.js';
import {
  AUDIO_ATTACHMENT_MAX_BYTES,
  AUDIO_ATTACHMENT_MIME_TYPES,
  IMAGE_ATTACHMENT_MAX_BYTES,
  IMAGE_ATTACHMENT_MIME_TYPES,
  ValidationError,
  baseMimeType,
} from '@shared/types/index.js';
import { generateId, now } from '@shared/utilities/index.js';

export type AttachmentKind = 'image' | 'audio';

export interface AttachmentData {
  id: UUID;
  noteId: UUID;
  chainId: UUID;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  byteSize: number;
  altText?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  duration?: number | undefined;
  createdAt: ISODateString;
}

interface BaseAttachmentParams {
  noteId: UUID;
  chainId: UUID;
  fileName: string;
  mimeType: string;
  byteSize: number;
}

export interface CreateImageAttachmentParams extends BaseAttachmentParams {
  width?: number;
  height?: number;
  altText?: string;
}

export interface CreateAudioAttachmentParams extends BaseAttachmentParams {
  duration: number;
}

function validateCommon(params: BaseAttachmentParams, maxBytes: number, label: string): void {
  if (!params.noteId) throw new ValidationError('O anexo precisa pertencer a uma nota.');
  if (!params.chainId) throw new ValidationError('O anexo precisa pertencer a uma cadeia.');
  if (!params.fileName.trim()) throw new ValidationError('O nome do arquivo é obrigatório.');
  if (!Number.isFinite(params.byteSize) || params.byteSize <= 0) {
    throw new ValidationError('O tamanho do arquivo é inválido.');
  }
  if (params.byteSize > maxBytes) {
    throw new ValidationError(`${label} excede o limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

function validateImageDimensions(value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError('As dimensões da imagem são inválidas.');
  }
}

export class Attachment {
  private constructor(private readonly data: AttachmentData) {}

  static createImage(params: CreateImageAttachmentParams): Attachment {
    validateCommon(params, IMAGE_ATTACHMENT_MAX_BYTES, 'A imagem');
    if (!(IMAGE_ATTACHMENT_MIME_TYPES as readonly string[]).includes(baseMimeType(params.mimeType))) {
      throw new ValidationError('O arquivo precisa ser uma imagem raster suportada.');
    }
    validateImageDimensions(params.width);
    validateImageDimensions(params.height);

    return new Attachment({
      id: generateId(),
      noteId: params.noteId,
      chainId: params.chainId,
      kind: 'image',
      fileName: params.fileName.trim(),
      mimeType: params.mimeType,
      byteSize: params.byteSize,
      altText: params.altText?.trim() || params.fileName.trim(),
      ...(params.width ? { width: params.width } : {}),
      ...(params.height ? { height: params.height } : {}),
      createdAt: now(),
    });
  }

  static createAudio(params: CreateAudioAttachmentParams): Attachment {
    validateCommon(params, AUDIO_ATTACHMENT_MAX_BYTES, 'O áudio');
    if (!(AUDIO_ATTACHMENT_MIME_TYPES as readonly string[]).includes(baseMimeType(params.mimeType))) {
      throw new ValidationError('O arquivo precisa ser um áudio suportado.');
    }
    if (!Number.isFinite(params.duration) || params.duration <= 0) {
      throw new ValidationError('A duração do áudio é inválida.');
    }

    return new Attachment({
      id: generateId(),
      noteId: params.noteId,
      chainId: params.chainId,
      kind: 'audio',
      fileName: params.fileName.trim(),
      mimeType: params.mimeType,
      byteSize: params.byteSize,
      duration: Number(params.duration.toFixed(1)),
      createdAt: now(),
    });
  }

  static reconstitute(data: AttachmentData): Attachment {
    return new Attachment({ ...data });
  }

  get id(): UUID { return this.data.id; }
  get noteId(): UUID { return this.data.noteId; }
  get chainId(): UUID { return this.data.chainId; }
  get kind(): AttachmentKind { return this.data.kind; }
  get fileName(): string { return this.data.fileName; }
  get mimeType(): string { return this.data.mimeType; }
  get byteSize(): number { return this.data.byteSize; }
  get altText(): string | undefined { return this.data.altText; }
  get width(): number | undefined { return this.data.width; }
  get height(): number | undefined { return this.data.height; }
  get duration(): number | undefined { return this.data.duration; }
  get createdAt(): ISODateString { return this.data.createdAt; }

  toData(): AttachmentData {
    return {
      ...this.data,
      ...(this.data.altText ? { altText: this.data.altText } : {}),
      ...(this.data.width ? { width: this.data.width } : {}),
      ...(this.data.height ? { height: this.data.height } : {}),
      ...(this.data.duration ? { duration: this.data.duration } : {}),
    };
  }
}
