import {
  consumeExpectedKeyboardReload,
  installModifierKeyTracker,
  isModifierKeyPressed,
} from './modifierKeys.js';

export interface UnloadGuardOptions {
  flush: () => void;
}

let detachGuard: (() => void) | null = null;

export function installUnloadGuard(options: UnloadGuardOptions): () => void {
  detachGuard?.();

  const flush = (): void => options.flush();
  const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    flush();

    if (consumeExpectedKeyboardReload()) return;
    if (!isModifierKeyPressed()) return;

    event.preventDefault();
    event.returnValue = true;
  };
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') flush();
  };

  const detachModifierKeys = installModifierKeyTracker();
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const remove = (): void => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', flush);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    detachModifierKeys();
    if (detachGuard === remove) detachGuard = null;
  };

  detachGuard = remove;
  return remove;
}
