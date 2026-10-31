import type { ChainDetailDTO, NoteDTO } from '@application/dto/index.js';
import { generateId } from '@shared/utilities/index.js';

export interface EditorTarget {
  chainId: string;
  noteId: string;
  role: 'header' | 'tail';
  chainTitle?: string;
}

export interface DraftTab {
  kind: 'draft';
  id: string;
  title: string;
  content: string;
  savedContent: string;
  target: EditorTarget | null;
}

export interface ChainNoteTab {
  id: string;
  content: string;
}

export interface ChainTab {
  kind: 'chain';
  id: string;
  chainId: string;
  title: string;
  notes: NoteDTO[];
  noteTabs: ChainNoteTab[];
  activeNoteTabId: string | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
}

export type EditorTab = DraftTab | ChainTab;

export interface EditorSnapshot {
  tabs: EditorTab[];
  activeTabId: string | null;
}

type Listener = (snapshot: EditorSnapshot) => void;

export const EDITOR_STORAGE_KEY = 'threadnotes.editor.tabs';

const PERSIST_DELAY_MS = 250;

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTarget(value: unknown): value is EditorTarget {
  if (!isRecord(value)) return false;
  return (
    typeof value['chainId'] === 'string' &&
    typeof value['noteId'] === 'string' &&
    (value['role'] === 'header' || value['role'] === 'tail') &&
    (value['chainTitle'] === undefined || typeof value['chainTitle'] === 'string')
  );
}

function isDraftTab(value: unknown): value is DraftTab {
  if (!isRecord(value)) return false;
  if (value['kind'] !== undefined && value['kind'] !== 'draft') return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['content'] === 'string' &&
    typeof value['savedContent'] === 'string' &&
    (value['target'] === null || isTarget(value['target']))
  );
}

function isChainNoteTab(value: unknown): value is ChainNoteTab {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['content'] === 'string'
  );
}

function createBlankNoteTab(): ChainNoteTab {
  return { id: generateId(), content: '' };
}

function cloneNoteTab(noteTab: ChainNoteTab): ChainNoteTab {
  return { ...noteTab };
}

function cloneNote(note: NoteDTO): NoteDTO {
  return { ...note };
}

function cloneTab(tab: EditorTab): EditorTab {
  if (tab.kind === 'draft') {
    return {
      ...tab,
      target: tab.target ? { ...tab.target } : null,
    };
  }

  return {
    ...tab,
    notes: tab.notes.map(cloneNote),
    noteTabs: tab.noteTabs.map(cloneNoteTab),
  };
}

export function deriveEditorTitle(content: string): string {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return 'Sem título';
  return firstLine.length > 52 ? `${firstLine.slice(0, 52).trimEnd()}…` : firstLine;
}

export function isChainNoteTabDirty(noteTab: ChainNoteTab): boolean {
  return noteTab.content.trim().length > 0;
}

export function isEditorTabDirty(tab: EditorTab): boolean {
  return tab.kind === 'draft'
    ? tab.content !== tab.savedContent
    : tab.noteTabs.some(isChainNoteTabDirty);
}

export class EditorStore {
  private tabs: EditorTab[] = [];
  private activeTabId: string | null = null;
  private listeners = new Set<Listener>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly storage: Storage | null = getSessionStorage()) {
    this.restore();
  }

  getSnapshot(): EditorSnapshot {
    return {
      tabs: this.tabs.map(cloneTab),
      activeTabId: this.activeTabId,
    };
  }

  getActiveTab(): EditorTab | null {
    const tab = this.tabs.find((item) => item.id === this.activeTabId);
    return tab ? cloneTab(tab) : null;
  }

  getTab(id: string): EditorTab | null {
    const tab = this.tabs.find((item) => item.id === id);
    return tab ? cloneTab(tab) : null;
  }

  findChainTab(chainId: string): ChainTab | null {
    const tab = this.tabs.find(
      (item) => item.kind === 'chain' && item.chainId === chainId
    );
    return tab && tab.kind === 'chain' ? (cloneTab(tab) as ChainTab) : null;
  }

  getChainNoteTab(chainTabId: string, noteTabId: string): ChainNoteTab | null {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain') return null;
    const noteTab = tab.noteTabs.find((item) => item.id === noteTabId);
    return noteTab ? cloneNoteTab(noteTab) : null;
  }

  getActiveChainNoteTab(chainTabId: string): ChainNoteTab | null {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain' || !tab.activeNoteTabId) return null;
    return this.getChainNoteTab(chainTabId, tab.activeNoteTabId);
  }

  hasDirtyChainNoteTabs(chainTabId: string): boolean {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    return tab?.kind === 'chain' ? tab.noteTabs.some(isChainNoteTabDirty) : false;
  }

  ensureTab(): EditorTab {
    if (this.tabs.length === 0) {
      return this.createDraftTab();
    }

    const activeExists = this.tabs.some((tab) => tab.id === this.activeTabId);
    if (!activeExists) {
      this.activeTabId = this.tabs[0]?.id ?? null;
      this.persist();
      this.notify();
    }

    return this.getActiveTab()!;
  }

  createDraftTab(): DraftTab {
    const tab: DraftTab = {
      kind: 'draft',
      id: generateId(),
      title: 'Sem título',
      content: '',
      savedContent: '',
      target: null,
    };

    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this.persist();
    this.notify();
    return cloneTab(tab) as DraftTab;
  }

  openChainTab(chainId: string, title: string): ChainTab {
    const existing = this.tabs.find(
      (item) => item.kind === 'chain' && item.chainId === chainId
    );

    if (existing && existing.kind === 'chain') {
      if (this.activeTabId !== existing.id) {
        this.activeTabId = existing.id;
        this.persist();
        this.notify();
      }
      return cloneTab(existing) as ChainTab;
    }

    const noteTab = createBlankNoteTab();
    const tab: ChainTab = {
      kind: 'chain',
      id: generateId(),
      chainId,
      title,
      notes: [],
      noteTabs: [noteTab],
      activeNoteTabId: noteTab.id,
      status: 'idle',
    };

    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this.persist();
    this.notify();
    return cloneTab(tab) as ChainTab;
  }

  ensureChainNoteTab(chainTabId: string): ChainNoteTab | null {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain') return null;

    if (tab.noteTabs.length === 0) {
      const noteTab = createBlankNoteTab();
      tab.noteTabs.push(noteTab);
      tab.activeNoteTabId = noteTab.id;
      this.persist();
      this.notify();
      return cloneNoteTab(noteTab);
    }

    const activeExists = tab.noteTabs.some((item) => item.id === tab.activeNoteTabId);
    if (!activeExists) {
      tab.activeNoteTabId = tab.noteTabs[0]?.id ?? null;
      this.persist();
      this.notify();
    }

    return tab.activeNoteTabId
      ? this.getChainNoteTab(chainTabId, tab.activeNoteTabId)
      : null;
  }

  createChainNoteTab(chainTabId: string): ChainNoteTab | null {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain') return null;

    const noteTab = createBlankNoteTab();
    tab.noteTabs.push(noteTab);
    tab.activeNoteTabId = noteTab.id;
    this.persist();
    this.notify();
    return cloneNoteTab(noteTab);
  }

  selectChainNoteTab(chainTabId: string, noteTabId: string): boolean {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain') return false;
    if (!tab.noteTabs.some((item) => item.id === noteTabId)) return false;
    if (tab.activeNoteTabId === noteTabId) return true;

    tab.activeNoteTabId = noteTabId;
    this.persist();
    this.notify();
    return true;
  }

  updateChainNoteTab(chainTabId: string, noteTabId: string, content: string): void {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain') return;
    const noteTab = tab.noteTabs.find((item) => item.id === noteTabId);
    if (!noteTab) return;

    const wasDirty = isChainNoteTabDirty(noteTab);
    const previousTitle = deriveEditorTitle(noteTab.content);
    noteTab.content = content;

    if (
      wasDirty !== isChainNoteTabDirty(noteTab) ||
      previousTitle !== deriveEditorTitle(noteTab.content)
    ) {
      this.notify();
    }

    this.persist();
  }

  removeChainNoteTab(chainTabId: string, noteTabId: string): void {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain') return;

    const index = tab.noteTabs.findIndex((item) => item.id === noteTabId);
    if (index < 0) return;

    tab.noteTabs.splice(index, 1);

    if (tab.activeNoteTabId === noteTabId) {
      const next = tab.noteTabs[index] ?? tab.noteTabs[index - 1] ?? null;
      tab.activeNoteTabId = next?.id ?? null;
    }

    this.persist();
    this.notify();
  }

  selectTab(id: string): boolean {
    if (!this.tabs.some((tab) => tab.id === id)) return false;
    if (this.activeTabId === id) return true;

    this.activeTabId = id;
    this.persist();
    this.notify();
    return true;
  }

  updateDraftContent(id: string, content: string): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'draft') return;

    const wasDirty = isEditorTabDirty(tab);
    const previousTitle = tab.title;

    tab.content = content;
    tab.title = deriveEditorTitle(content);

    if (wasDirty !== isEditorTabDirty(tab) || previousTitle !== tab.title) {
      this.notify();
    }

    this.persist();
  }

  setChainTabStatus(id: string, status: ChainTab['status']): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'chain') return;
    tab.status = status;
    this.notify();
  }

  setChainTabNotes(id: string, detail: ChainDetailDTO): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'chain') return;

    tab.title = detail.displayTitle;
    tab.notes = detail.notes.map(cloneNote);
    tab.status = 'loaded';
    this.persist();
    this.notify();
  }

  setChainTabError(id: string): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'chain') return;
    tab.status = 'error';
    this.notify();
  }

  appendNoteToChainTab(id: string, note: NoteDTO): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'chain') return;
    tab.notes = [...tab.notes, cloneNote(note)];
    this.notify();
  }

  updateNoteInChainTabs(chainId: string, note: NoteDTO): void {
    let changed = false;

    this.tabs.forEach((tab) => {
      if (tab.kind !== 'chain' || tab.chainId !== chainId) return;
      const index = tab.notes.findIndex((item) => item.id === note.id);
      if (index < 0) return;
      tab.notes[index] = cloneNote(note);
      changed = true;
    });

    if (changed) this.notify();
  }

  updateChainTitleInTabs(chainId: string, title: string): void {
    let changed = false;

    this.tabs.forEach((tab) => {
      if (tab.kind !== 'chain' || tab.chainId !== chainId) return;
      if (tab.title === title) return;
      tab.title = title;
      changed = true;
    });

    if (changed) {
      this.persist();
      this.notify();
    }
  }

  markDraftSaved(id: string, target: EditorTarget, savedContent: string): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'draft') return;

    tab.savedContent = savedContent;
    tab.target = { ...target };
    this.persist();
    this.notify();
  }

  closeTab(id: string): void {
    const index = this.tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return;

    this.tabs.splice(index, 1);

    if (this.activeTabId === id) {
      const next = this.tabs[index] ?? this.tabs[index - 1] ?? null;
      this.activeTabId = next?.id ?? null;
    }

    this.persist();
    this.notify();
  }

  closeChainTabs(chainId: string): void {
    const ids = this.tabs
      .filter((tab) => tab.kind === 'chain' && tab.chainId === chainId)
      .map((tab) => tab.id);

    ids.forEach((id) => this.closeTab(id));
  }

  hasDirtyTabs(): boolean {
    return this.tabs.some(isEditorTabDirty);
  }

  flush(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.write();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private restore(): void {
    if (!this.storage) return;

    try {
      const raw = this.storage.getItem(EDITOR_STORAGE_KEY);
      if (!raw) return;

      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || !Array.isArray(parsed['tabs'])) return;

      const restored: EditorTab[] = [];

      for (const rawTab of parsed['tabs']) {
        if (isRecord(rawTab) && rawTab['kind'] === 'chain') {
          const chainTab = this.normalizeChainTab(rawTab);
          if (chainTab) restored.push(chainTab);
        } else if (isDraftTab(rawTab)) {
          restored.push({
            kind: 'draft',
            id: rawTab.id,
            title: deriveEditorTitle(rawTab.content),
            content: rawTab.content,
            savedContent: rawTab.savedContent,
            target: rawTab.target ? { ...rawTab.target } : null,
          });
        }
      }

      if (restored.length === 0) return;

      this.tabs = restored;
      const savedActiveId = typeof parsed['activeTabId'] === 'string' ? parsed['activeTabId'] : null;
      this.activeTabId = restored.some((tab) => tab.id === savedActiveId)
        ? savedActiveId
        : restored[0]!.id;
    } catch {
      this.tabs = [];
      this.activeTabId = null;
    }
  }

  private normalizeChainTab(raw: Record<string, unknown>): ChainTab | null {
    if (
      typeof raw['id'] !== 'string' ||
      typeof raw['chainId'] !== 'string' ||
      typeof raw['title'] !== 'string'
    ) {
      return null;
    }

    const storedTabs = Array.isArray(raw['noteTabs'])
      ? raw['noteTabs'].filter(isChainNoteTab).map(cloneNoteTab)
      : [];
    const legacyComposer =
      typeof raw['composer'] === 'string' ? raw['composer'] : '';
    const noteTabs =
      storedTabs.length > 0
        ? storedTabs
        : [{ id: generateId(), content: legacyComposer }];
    const savedActiveId =
      typeof raw['activeNoteTabId'] === 'string' ? raw['activeNoteTabId'] : null;
    const activeNoteTabId = noteTabs.some((tab) => tab.id === savedActiveId)
      ? savedActiveId
      : noteTabs[0]!.id;

    return {
      kind: 'chain',
      id: raw['id'],
      chainId: raw['chainId'],
      title: raw['title'],
      notes: [],
      noteTabs,
      activeNoteTabId,
      status: 'idle',
    };
  }

  private persist(): void {
    if (this.persistTimer !== null) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.write();
    }, PERSIST_DELAY_MS);
  }

  private write(): void {
    if (!this.storage) return;

    try {
      if (this.tabs.length === 0) {
        this.storage.removeItem(EDITOR_STORAGE_KEY);
        return;
      }

      const tabs = this.tabs.map((tab) =>
        tab.kind === 'draft'
          ? tab
          : {
              kind: 'chain',
              id: tab.id,
              chainId: tab.chainId,
              title: tab.title,
              noteTabs: tab.noteTabs,
              activeNoteTabId: tab.activeNoteTabId,
            }
      );

      this.storage.setItem(
        EDITOR_STORAGE_KEY,
        JSON.stringify({
          tabs,
          activeTabId: this.activeTabId,
        })
      );
    } catch {
      return;
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const editorStore = new EditorStore();
