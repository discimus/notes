import type { UUID, ISODateString } from '../../shared/types/index.js';
import { TagName } from '../value-objects/index.js';
import { generateId } from '../../shared/utilities/index.js';
import { now } from '../../shared/utilities/index.js';

/** Origem de uma tag */
export type TagOrigin = 'manual' | 'suggested' | 'accepted' | 'rejected';

export interface TagData {
  id: UUID;
  name: string;
  normalizedName: string;
  createdAt: ISODateString;
  origin: TagOrigin;
}

/**
 * Entidade: Tag.
 * Tags são associadas a headers de cadeias, não diretamente às tails.
 * Suporta rastreio de origem para futuras integrações com classificadores.
 */
export class Tag {
  private readonly _id: UUID;
  private _name: TagName;
  private readonly _createdAt: ISODateString;
  private _origin: TagOrigin;

  private constructor(data: TagData) {
    this._id = data.id;
    this._name = TagName.create(data.name);
    this._createdAt = data.createdAt;
    this._origin = data.origin;
  }

  static create(name: string, origin: TagOrigin = 'manual'): Tag {
    const tagName = TagName.create(name);
    return new Tag({
      id: generateId(),
      name: tagName.value,
      normalizedName: tagName.normalized,
      createdAt: now(),
      origin,
    });
  }

  static reconstitute(data: TagData): Tag {
    return new Tag(data);
  }

  get id(): UUID { return this._id; }
  get name(): TagName { return this._name; }
  get createdAt(): ISODateString { return this._createdAt; }
  get origin(): TagOrigin { return this._origin; }

  rename(newName: string): void {
    this._name = TagName.create(newName);
  }

  markAsAccepted(): void {
    if (this._origin === 'suggested') {
      this._origin = 'accepted';
    }
  }

  markAsRejected(): void {
    if (this._origin === 'suggested') {
      this._origin = 'rejected';
    }
  }

  toData(): TagData {
    return {
      id: this._id,
      name: this._name.value,
      normalizedName: this._name.normalized,
      createdAt: this._createdAt,
      origin: this._origin,
    };
  }
}
