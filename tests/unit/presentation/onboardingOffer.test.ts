import { describe, expect, it, vi } from 'vitest';
import {
  ONBOARDING_STORAGE_KEY,
  offerExampleScenarioIfNeeded,
  type OnboardingStorage,
} from '@presentation/app/onboarding.js';

function makeStorage(initial: Record<string, string> = {}): OnboardingStorage & {
  values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('oferta do cenário de exemplo', () => {
  it('pergunta e carrega os exemplos quando a biblioteca está vazia', async () => {
    const storage = makeStorage();
    const confirm = vi.fn(async () => true);
    const load = vi.fn(async () => undefined);

    const result = await offerExampleScenarioIfNeeded({
      storage,
      isLibraryEmpty: async () => true,
      confirmLoadExamples: confirm,
      loadExamples: load,
    });

    expect(result).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(storage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true');
  });

  it('registra a escolha de começar em branco sem carregar dados', async () => {
    const storage = makeStorage();
    const load = vi.fn(async () => undefined);

    const result = await offerExampleScenarioIfNeeded({
      storage,
      isLibraryEmpty: async () => true,
      confirmLoadExamples: async () => false,
      loadExamples: load,
    });

    expect(result).toBe(false);
    expect(load).not.toHaveBeenCalled();
    expect(storage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true');
  });

  it('não pergunta novamente quando o onboarding já foi concluído', async () => {
    const storage = makeStorage({ [ONBOARDING_STORAGE_KEY]: 'true' });
    const confirm = vi.fn(async () => true);

    const result = await offerExampleScenarioIfNeeded({
      storage,
      isLibraryEmpty: async () => true,
      confirmLoadExamples: confirm,
      loadExamples: async () => undefined,
    });

    expect(result).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('não pergunta quando já existem coleções ou tags', async () => {
    const storage = makeStorage();
    const confirm = vi.fn(async () => true);

    const result = await offerExampleScenarioIfNeeded({
      storage,
      isLibraryEmpty: async () => false,
      confirmLoadExamples: confirm,
      loadExamples: async () => undefined,
    });

    expect(result).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(storage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });

  it('não marca o onboarding como concluído se o carregamento falhar', async () => {
    const storage = makeStorage();

    await expect(
      offerExampleScenarioIfNeeded({
        storage,
        isLibraryEmpty: async () => true,
        confirmLoadExamples: async () => true,
        loadExamples: async () => {
          throw new Error('falha ao carregar');
        },
      })
    ).rejects.toThrow('falha ao carregar');

    expect(storage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });
});
