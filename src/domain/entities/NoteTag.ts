import type { UUID, ISODateString } from '@shared/types/index.js';
import { now } from '@shared/utilities/index.js';

export interface NoteTagData {
  noteId: UUID;
  chainId: UUID;
  tagId: UUID;
  assignedAt: ISODateString;
}

export class NoteTag {
  private readonly _noteId: UUID;
  private readonly _chainId: UUID;
  private readonly _tagId: UUID;
  private readonly _assignedAt: ISODateString;

  private constructor(data: NoteTagData) {
    this._noteId = data.noteId;
    this._chainId = data.chainId;
    this._tagId = data.tagId;
    this._assignedAt = data.assignedAt;
  }

  static create(noteId: UUID, chainId: UUID, tagId: UUID): NoteTag {
    return new NoteTag({ noteId, chainId, tagId, assignedAt: now() });
  }

  static reconstitute(data: NoteTagData): NoteTag {
    return new NoteTag(data);
  }

  get noteId(): UUID { return this._noteId; }
  get chainId(): UUID { return this._chainId; }
  get tagId(): UUID { return this._tagId; }
  get assignedAt(): ISODateString { return this._assignedAt; }

  toData(): NoteTagData {
    return {
      noteId: this._noteId,
      chainId: this._chainId,
      tagId: this._tagId,
      assignedAt: this._assignedAt,
    };
  }
}
