export interface AppSettings {
  confirmBeforeTrash: boolean;
}

const STORAGE_KEY = 'threadnotes.settings';

const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  confirmBeforeTrash: true,
});

function cloneDefaults(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return cloneDefaults();

    return {
      confirmBeforeTrash:
        typeof parsed['confirmBeforeTrash'] === 'boolean'
          ? parsed['confirmBeforeTrash']
          : DEFAULT_SETTINGS.confirmBeforeTrash,
    };
  } catch {
    return cloneDefaults();
  }
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const next: AppSettings = {
    confirmBeforeTrash:
      typeof patch.confirmBeforeTrash === 'boolean'
        ? patch.confirmBeforeTrash
        : current.confirmBeforeTrash,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return current;
  }

  return next;
}
