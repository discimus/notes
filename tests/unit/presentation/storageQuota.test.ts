import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_QUOTA_ERROR_MESSAGE,
  STORAGE_SAFETY_RATIO,
  estimateStorage,
  isQuotaExceededError,
  requestPersistentStorage,
  storageErrorMessage,
} from '@presentation/app/storageQuota.js';

function setStorage(value: unknown): void {
  Object.defineProperty(navigator, 'storage', {
    value,
    configurable: true,
  });
}

describe('storageQuota', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage');
    vi.restoreAllMocks();
  });

  it('detecta QuotaExceededError por DOMException e por nome/código', () => {
    expect(isQuotaExceededError(new DOMException('cheio', 'QuotaExceededError'))).toBe(true);
    expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true);
    expect(isQuotaExceededError({ code: 22 })).toBe(true);
    expect(isQuotaExceededError(new Error('outra falha'))).toBe(false);
  });

  it('traduz erro de quota e mantém mensagens de outros erros', () => {
    expect(storageErrorMessage({ name: 'QuotaExceededError' })).toBe(
      STORAGE_QUOTA_ERROR_MESSAGE
    );
    expect(storageErrorMessage(new Error('falha específica'))).toBe('falha específica');
  });

  it('estima a quota aplicando margem de segurança e lê persistência', async () => {
    setStorage({
      estimate: vi.fn().mockResolvedValue({ usage: 200, quota: 1000 }),
      persisted: vi.fn().mockResolvedValue(true),
    });

    const estimate = await estimateStorage();

    expect(estimate).toMatchObject({
      usage: 200,
      quota: 1000,
      availableBytes: 800,
      usableBytes: Math.floor(800 * STORAGE_SAFETY_RATIO),
      persisted: true,
    });
  });

  it('retorna null quando a API de estimativa não existe ou falha', async () => {
    setStorage(undefined);
    expect(await estimateStorage()).toBeNull();

    setStorage({
      estimate: vi.fn().mockRejectedValue(new Error('indisponível')),
    });
    expect(await estimateStorage()).toBeNull();
  });

  it('solicita persistência apenas quando necessário', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    setStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist,
    });

    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);

    setStorage({
      persisted: vi.fn().mockResolvedValue(true),
      persist,
    });
    persist.mockClear();
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
});
