import { afterEach, describe, expect, it } from 'vitest';
import {
  consumeExpectedKeyboardReload,
  installModifierKeyTracker,
  isModifierKeyPressed,
} from '@presentation/app/modifierKeys.js';

let cleanup: (() => void) | null = null;

function key(type: 'keydown' | 'keyup', init: KeyboardEventInit): void {
  window.dispatchEvent(
    new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })
  );
}

describe('modifierKeys', () => {
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it('acompanha Ctrl, Alt, Shift e Meta', () => {
    cleanup = installModifierKeyTracker();
    expect(isModifierKeyPressed()).toBe(false);

    key('keydown', { key: 'Control', ctrlKey: true });
    expect(isModifierKeyPressed()).toBe(true);
    key('keyup', { key: 'Control', ctrlKey: false });

    key('keydown', { key: 'Alt', altKey: true });
    expect(isModifierKeyPressed()).toBe(true);
    key('keyup', { key: 'Alt', altKey: false });

    key('keydown', { key: 'Shift', shiftKey: true });
    expect(isModifierKeyPressed()).toBe(true);
    key('keyup', { key: 'Shift', shiftKey: false });

    key('keydown', { key: 'Meta', metaKey: true });
    expect(isModifierKeyPressed()).toBe(true);
    key('keyup', { key: 'Meta', metaKey: false });

    expect(isModifierKeyPressed()).toBe(false);
  });

  it('reseta o estado ao perder o foco da janela', () => {
    cleanup = installModifierKeyTracker();
    key('keydown', { key: 'Control', ctrlKey: true });
    expect(isModifierKeyPressed()).toBe(true);

    window.dispatchEvent(new Event('blur'));

    expect(isModifierKeyPressed()).toBe(false);
  });

  it('marca Ctrl+R como recarregamento esperado apenas uma vez', () => {
    cleanup = installModifierKeyTracker();

    key('keydown', { key: 'r', ctrlKey: true });

    expect(consumeExpectedKeyboardReload()).toBe(true);
    expect(consumeExpectedKeyboardReload()).toBe(false);
  });
});
