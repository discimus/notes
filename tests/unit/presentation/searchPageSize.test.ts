import { describe, expect, it } from 'vitest';
import { appState } from '@presentation/state/AppState.js';

describe('Tamanho da página de busca', () => {
  it('limita a primeira carga a 10 resultados', () => {
    expect(appState.get().searchPageSize).toBe(10);
  });
});
