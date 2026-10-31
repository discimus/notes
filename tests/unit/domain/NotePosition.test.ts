import { describe, it, expect } from 'vitest';
import { NotePosition } from '../../../src/domain/value-objects/NotePosition.js';
import { ValidationError } from '../../../src/shared/types/index.js';

describe('NotePosition', () => {
  it('deve criar posição header (0)', () => {
    const pos = NotePosition.header();
    expect(pos.value).toBe(0);
    expect(pos.isHeader()).toBe(true);
  });

  it('deve criar posição arbitrária válida', () => {
    const pos = NotePosition.of(3);
    expect(pos.value).toBe(3);
    expect(pos.isHeader()).toBe(false);
  });

  it('deve criar posição seguinte', () => {
    const pos = NotePosition.of(2);
    const next = NotePosition.next(pos);
    expect(next.value).toBe(3);
  });

  it('deve lançar erro para posição negativa', () => {
    expect(() => NotePosition.of(-1)).toThrow(ValidationError);
  });

  it('deve lançar erro para posição não-inteira', () => {
    expect(() => NotePosition.of(1.5)).toThrow(ValidationError);
  });

  it('deve comparar posições corretamente', () => {
    const a = NotePosition.of(1);
    const b = NotePosition.of(3);
    expect(a.compareTo(b)).toBeLessThan(0);
    expect(b.compareTo(a)).toBeGreaterThan(0);
    expect(a.compareTo(NotePosition.of(1))).toBe(0);
  });
});
