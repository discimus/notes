import { ValidationError } from '../../shared/types/index.js';
import { normalizeText } from '../../shared/utilities/index.js';

/**
 * Value Object: Nome normalizado de uma tag.
 * Garante unicidade insensível a capitalização e acentos.
 */
export class TagName {
  private readonly _raw: string;
  private readonly _normalized: string;

  private constructor(raw: string, normalized: string) {
    this._raw = raw;
    this._normalized = normalized;
  }

  static create(value: string): TagName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('O nome da tag não pode ser vazio.');
    }
    if (trimmed.length > 50) {
      throw new ValidationError('O nome da tag não pode exceder 50 caracteres.');
    }
    if (/\s/.test(trimmed)) {
      throw new ValidationError('O nome da tag não pode conter espaços. Use hífens para separar palavras.');
    }
    return new TagName(trimmed, normalizeText(trimmed));
  }

  get value(): string {
    return this._raw;
  }

  get normalized(): string {
    return this._normalized;
  }

  equals(other: TagName): boolean {
    return this._normalized === other._normalized;
  }

  toString(): string {
    return this._raw;
  }
}
