import type { UUID, ISODateString } from '../../shared/types/index.js';
import { now } from '../../shared/utilities/index.js';

export interface ChainTagData {
  chainId: UUID;
  tagId: UUID;
  assignedAt: ISODateString;
}

/**
 * Associação entre Chain e Tag.
 * Tags são associadas ao header via a entidade ChainTag.
 */
export class ChainTag {
  private readonly _chainId: UUID;
  private readonly _tagId: UUID;
  private readonly _assignedAt: ISODateString;

  private constructor(data: ChainTagData) {
    this._chainId = data.chainId;
    this._tagId = data.tagId;
    this._assignedAt = data.assignedAt;
  }

  static create(chainId: UUID, tagId: UUID): ChainTag {
    return new ChainTag({ chainId, tagId, assignedAt: now() });
  }

  static reconstitute(data: ChainTagData): ChainTag {
    return new ChainTag(data);
  }

  get chainId(): UUID { return this._chainId; }
  get tagId(): UUID { return this._tagId; }
  get assignedAt(): ISODateString { return this._assignedAt; }

  toData(): ChainTagData {
    return {
      chainId: this._chainId,
      tagId: this._tagId,
      assignedAt: this._assignedAt,
    };
  }
}
