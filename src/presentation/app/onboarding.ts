export const ONBOARDING_STORAGE_KEY = 'threadnotes.onboarding-done';

export interface OnboardingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface OfferExampleScenarioOptions {
  isLibraryEmpty: () => Promise<boolean>;
  confirmLoadExamples: () => Promise<boolean>;
  loadExamples: () => Promise<void>;
  storage?: OnboardingStorage | null;
}

function getLocalStorage(): OnboardingStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function hasCompletedOnboarding(
  storage: OnboardingStorage | null = getLocalStorage()
): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export async function offerExampleScenarioIfNeeded(
  options: OfferExampleScenarioOptions
): Promise<boolean> {
  const storage =
    options.storage === undefined ? getLocalStorage() : options.storage;

  if (hasCompletedOnboarding(storage)) return false;
  if (!(await options.isLibraryEmpty())) return false;

  const shouldLoad = await options.confirmLoadExamples();

  if (shouldLoad) {
    await options.loadExamples();
  }

  try {
    storage?.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {}

  return shouldLoad;
}
