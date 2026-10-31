import { ValidationError } from '../../shared/types/index.js';

/**
 * Value Object: Posição de uma nota dentro de uma cadeia.
 * A posição começa em 0 (header) e incrementa sequencialmente.
 * Garante ordenação determinística.
 */
export class NotePosition {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static header(): NotePosition {
    return new NotePosition(0);
  }

  static of(value: number): NotePosition {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError(`Posição inválida: ${value}. Deve ser um inteiro não-negativo.`);
    }
    return new NotePosition(value);
  }

  static next(current: NotePosition): NotePosition {
    return new NotePosition(current._value + 1);
  }

  get value(): number {
    return this._value;
  }

  isHeader(): boolean {
    return this._value === 0;
  }

  compareTo(other: NotePosition): number {
    return this._value - other._value;
  }

  equals(other: NotePosition): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return String(this._value);
  }
}
