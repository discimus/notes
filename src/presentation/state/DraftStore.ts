/**
 * Preserva rascunhos do compositor entre navegações.
 * Persiste em sessionStorage para sobreviver a reloads acidentais.
 */
export interface Draft {
  content: string;
  title?: string;
  mode: 'header' | 'tail';
  chainId?: string;
  savedAt: string;
}

const STORAGE_KEY = 'thread-notes:draft';

export const DraftStore = {
  save(draft: Draft): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // sessionStorage pode estar indisponível (modo privado restrito)
    }
  },

  load(): Draft | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Draft;
    } catch {
      return null;
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // silencioso
    }
  },
};
