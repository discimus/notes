import { describe, expect, it } from 'vitest';
import {
  CATALOG_VERSION,
  STANDARD_TAGS,
  affinityKeys,
  findStandardTagForTerm,
  standardTagByKey,
} from '@domain/services/tagSuggestions/index.js';

describe('catálogo de tags padronizadas', () => {
  it('mantém chaves únicas e um conjunto enxuto', () => {
    const keys = STANDARD_TAGS.map((tag) => tag.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThanOrEqual(20);
    expect(keys.length).toBeLessThanOrEqual(32);
    expect(CATALOG_VERSION).toBeGreaterThan(0);
  });

  it('mapeia termos específicos para tags amplas sem colisão', () => {
    expect(findStandardTagForTerm('typescript')?.tag.key).toBe('programacao');
    expect(findStandardTagForTerm('entity-framework')?.tag.key).toBe('programacao');
    expect(findStandardTagForTerm('ddd')?.tag.key).toBe('arquitetura');
    expect(findStandardTagForTerm('daily')?.tag.key).toBe('reuniao');
    expect(findStandardTagForTerm('economia')?.tag.key).toBe('financa');
    expect(new Set(affinityKeys()).size).toBe(affinityKeys().length);
  });

  it('permite consultar uma tag padronizada pela chave canônica', () => {
    expect(standardTagByKey('programacao')?.name).toBe('Programação');
    expect(standardTagByKey('nao-existe')).toBeNull();
  });
});
