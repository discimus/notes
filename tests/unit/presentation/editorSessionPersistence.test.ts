import { describe, expect, it, vi } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { initEditorSession } from '@presentation/views/editor.js';

describe('Editor session persistence', () => {
  it('faz flush em pagehide e visibilitychange', () => {
    const store = new EditorStore(sessionStorage);
    const flush = vi.spyOn(store, 'flush');
    initEditorSession(store);

    window.dispatchEvent(new Event('pagehide'));
    expect(flush).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(flush).toHaveBeenCalledTimes(2);
  });
});
