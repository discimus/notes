import { describe, expect, it } from 'vitest';
import {
  beginPendingOperation,
  hasPendingOperations,
  runPendingOperation,
} from '@shared/utilities/index.js';

describe('operações pendentes', () => {
  it('conta operações ativas e ignora finalização duplicada', () => {
    expect(hasPendingOperations()).toBe(false);

    const finish = beginPendingOperation();
    expect(hasPendingOperations()).toBe(true);

    finish();
    finish();
    expect(hasPendingOperations()).toBe(false);
  });

  it('mantém o estado durante a promise e libera ao finalizar', async () => {
    let observedInside = false;
    await runPendingOperation(async () => {
      observedInside = hasPendingOperations();
    });

    expect(observedInside).toBe(true);
    expect(hasPendingOperations()).toBe(false);
  });

  it('liberar o estado mesmo quando a operação falha', async () => {
    await expect(
      runPendingOperation(async () => {
        throw new Error('falha');
      })
    ).rejects.toThrow('falha');

    expect(hasPendingOperations()).toBe(false);
  });
});
