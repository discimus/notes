import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorStore } from '@presentation/state/EditorStore.js';
import { initEditorSession } from '@presentation/views/editor.js';

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

describe('confirmação ao fechar a aplicação', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    key('keyup', { key: 'Control', ctrlKey: false });
  });

  it('confirma com modificador pressionado mesmo sem alterações pendentes', () => {
    const store = new EditorStore();
    store.createDraftTab();
    initEditorSession(store);

    key('keydown', { key: 'Control', ctrlKey: true });
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

    key('keyup', { key: 'Control', ctrlKey: false });
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });
});
