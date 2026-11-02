import { afterEach, describe, expect, it, vi } from 'vitest';
import { installUnloadGuard } from '@presentation/app/unloadGuard.js';

let cleanup: (() => void) | null = null;

function key(type: 'keydown' | 'keyup', init: KeyboardEventInit): void {
  window.dispatchEvent(
    new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })
  );
}

function dispatchBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe('unloadGuard', () => {
  afterEach(() => {
    cleanup?.();
    cleanup = null;
    vi.restoreAllMocks();
  });

  it('não bloqueia o fechamento sem modificador pressionado', () => {
    const flush = vi.fn();
    cleanup = installUnloadGuard({ flush });

    const event = dispatchBeforeUnload();

    expect(flush).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(false);
  });

  it('bloqueia o fechamento com Ctrl pressionado e libera após keyup', () => {
    cleanup = installUnloadGuard({ flush: vi.fn() });

    key('keydown', { key: 'Control', ctrlKey: true });
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

    key('keyup', { key: 'Control', ctrlKey: false });
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('não bloqueia recarregamento com Ctrl+R', () => {
    cleanup = installUnloadGuard({ flush: vi.fn() });

    key('keydown', { key: 'r', ctrlKey: true });

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('reseta o estado de modificadores ao perder o foco', () => {
    cleanup = installUnloadGuard({ flush: vi.fn() });

    key('keydown', { key: 'Control', ctrlKey: true });
    window.dispatchEvent(new Event('blur'));

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it('substitui listeners anteriores e remove ao destruir', () => {
    const firstFlush = vi.fn();
    installUnloadGuard({ flush: firstFlush });

    const secondFlush = vi.fn();
    cleanup = installUnloadGuard({ flush: secondFlush });

    dispatchBeforeUnload();
    expect(firstFlush).not.toHaveBeenCalled();
    expect(secondFlush).toHaveBeenCalledOnce();

    cleanup();
    cleanup = null;
    dispatchBeforeUnload();
    expect(secondFlush).toHaveBeenCalledOnce();
  });

  it('faz flush ao esconder a página', () => {
    const flush = vi.fn();
    cleanup = installUnloadGuard({ flush });

    window.dispatchEvent(new Event('pagehide'));
    expect(flush).toHaveBeenCalledOnce();
  });
});
