const RELOAD_SUPPRESSION_MS = 1500;

let altKey = false;
let ctrlKey = false;
let metaKey = false;
let shiftKey = false;
let reloadExpectedUntil = 0;
let detach: (() => void) | null = null;

function update(event: KeyboardEvent): void {
  altKey = event.altKey;
  ctrlKey = event.ctrlKey;
  metaKey = event.metaKey;
  shiftKey = event.shiftKey;
}

function reset(): void {
  altKey = false;
  ctrlKey = false;
  metaKey = false;
  shiftKey = false;
}

export function isModifierKeyPressed(): boolean {
  return altKey || ctrlKey || metaKey || shiftKey;
}

export function consumeExpectedKeyboardReload(): boolean {
  if (Date.now() > reloadExpectedUntil) return false;
  reloadExpectedUntil = 0;
  return true;
}

export function installModifierKeyTracker(): () => void {
  if (detach) return detach;

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      event.key.toLowerCase() === 'r'
    ) {
      reloadExpectedUntil = Date.now() + RELOAD_SUPPRESSION_MS;
    }
    update(event);
  };
  const handleKeyUp = (event: KeyboardEvent): void => update(event);
  const handleBlur = (): void => reset();

  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('keyup', handleKeyUp, true);
  window.addEventListener('blur', handleBlur);

  const remove = (): void => {
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('keyup', handleKeyUp, true);
    window.removeEventListener('blur', handleBlur);
    reset();
    reloadExpectedUntil = 0;
    if (detach === remove) detach = null;
  };

  detach = remove;
  return remove;
}
