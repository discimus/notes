import type {
  ChainNoteTab,
  ChainTab,
  DraftTab,
  EditorSnapshot,
  EditorTab,
} from './EditorStore.js';
import { now } from '@shared/utilities/index.js';

export const PENDING_DRAFTS_STORAGE_KEY = 'threadnotes.editor.pending.v1';
const PENDING_DRAFTS_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeType(value: unknown): 'text' | 'code' {
  return value === 'code' ? 'code' : 'text';
}

function pendingDraft(tab: DraftTab): DraftTab | null {
  if (!tab.content.trim()) return null;
  const typeChanged =
    tab.target !== null &&
    normalizeType(tab.contentType) !== normalizeType(tab.savedContentType);

  if (tab.content === tab.savedContent && !typeChanged) return null;

  return {
    ...tab,
    target: tab.target ? { ...tab.target } : null,
  };
}

function pendingChainTab(tab: ChainTab): ChainTab | null {
  const noteTabs = tab.noteTabs.filter((note) => note.content.trim());
  if (noteTabs.length === 0) return null;

  const activeNoteTabId = noteTabs.some((note) => note.id === tab.activeNoteTabId)
    ? tab.activeNoteTabId
    : noteTabs[0]!.id;

  return {
    kind: 'chain',
    id: tab.id,
    chainId: tab.chainId,
    title: tab.title,
    notes: [],
    noteTabs: noteTabs.map((note): ChainNoteTab => ({ ...note })),
    activeNoteTabId,
    composerCollapsed: tab.composerCollapsed,
    status: 'idle',
  };
}

export function buildPendingSnapshot(snapshot: EditorSnapshot): EditorSnapshot | null {
  const tabs: EditorTab[] = [];

  for (const tab of snapshot.tabs) {
    const pending = tab.kind === 'draft' ? pendingDraft(tab) : pendingChainTab(tab);
    if (pending) tabs.push(pending);
  }

  if (tabs.length === 0) return null;

  const activeTabId = tabs.some((tab) => tab.id === snapshot.activeTabId)
    ? snapshot.activeTabId
    : tabs[0]!.id;

  return { tabs, activeTabId };
}

export function getLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class PendingDraftsCache {
  constructor(private readonly storage: Storage | null = getLocalStorage()) {}

  read(): string | null {
    if (!this.storage) return null;

    try {
      const raw = this.storage.getItem(PENDING_DRAFTS_STORAGE_KEY);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || !Array.isArray(parsed['tabs'])) return null;
      if (
        parsed['version'] !== undefined &&
        parsed['version'] !== PENDING_DRAFTS_VERSION
      ) {
        return null;
      }
      return raw;
    } catch {
      return null;
    }
  }

  write(snapshot: EditorSnapshot): void {
    if (!this.storage) return;

    try {
      const pending = buildPendingSnapshot(snapshot);
      if (!pending) {
        this.storage.removeItem(PENDING_DRAFTS_STORAGE_KEY);
        return;
      }

      this.storage.setItem(
        PENDING_DRAFTS_STORAGE_KEY,
        JSON.stringify({
          version: PENDING_DRAFTS_VERSION,
          savedAt: now(),
          activeTabId: pending.activeTabId,
          tabs: pending.tabs,
        })
      );
    } catch {
      return;
    }
  }

  clear(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(PENDING_DRAFTS_STORAGE_KEY);
    } catch {
      return;
    }
  }
}
