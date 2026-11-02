const STORAGE_KEY = 'threadnotes.auto-import-files';

let memoryPreference: boolean | null = null;

export function getAutoImportFiles(): boolean {
  if (memoryPreference !== null) return memoryPreference;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoImportFiles(value: boolean): void {
  memoryPreference = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    return;
  }
}
