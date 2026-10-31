import { describe, it, expect } from 'vitest';
import { TagName } from '../../../src/domain/value-objects/TagName.js';
import { ValidationError } from '../../../src/shared/types/index.js';

describe('TagName', () => {
  it('deve criar nome de tag válido', () => {
    const tag = TagName.create('projeto');
    expect(tag.value).toBe('projeto');
    expect(tag.normalized).toBe('projeto');
  });

  it('deve normalizar caracteres especiais', () => {
    const tag = TagName.create('Revisão');
    expect(tag.normalized).toBe('revisao');
    expect(tag.value).toBe('Revisão');
  });

  it('deve lançar erro para nome vazio', () => {
    expect(() => TagName.create('')).toThrow(ValidationError);
    expect(() => TagName.create('   ')).toThrow(ValidationError);
  });

  it('deve lançar erro para nome com espaço', () => {
    expect(() => TagName.create('meu projeto')).toThrow(ValidationError);
  });

  it('deve lançar erro para nome muito longo', () => {
    expect(() => TagName.create('a'.repeat(51))).toThrow(ValidationError);
  });

  it('deve verificar igualdade por nome normalizado', () => {
    const a = TagName.create('Revisão');
    const b = TagName.create('revisao');
    expect(a.equals(b)).toBe(true);
  });
});
