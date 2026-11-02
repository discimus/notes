const STORAGE_KEY = 'threadnotes.auto-open-blank-editor';

export function getAutoOpenBlankEditor(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoOpenBlankEditor(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    return;
  }
}
