import type { ChainDetailDTO, NoteContentType, NoteDTO } from '@application/dto/index.js';
import { generateId } from '@shared/utilities/index.js';
import { PendingDraftsCache } from './PendingDraftsCache.js';

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
  contentType?: NoteContentType | undefined;
  savedContent: string;
  savedContentType?: NoteContentType | undefined;
  target: EditorTarget | null;
}

export interface ChainNoteTab {
  id: string;
  content: string;
  contentType?: NoteContentType | undefined;
}

export interface ChainTab {
  kind: 'chain';
  id: string;
  chainId: string;
  title: string;
  notes: NoteDTO[];
  noteTabs: ChainNoteTab[];
  activeNoteTabId: string | null;
  composerCollapsed: boolean;
  status: 'idle' | 'loading' | 'loaded' | 'error';
}

export type EditorTab = DraftTab | ChainTab;

export interface EditorSnapshot {
  tabs: EditorTab[];
  activeTabId: string | null;
}

type Listener = (snapshot: EditorSnapshot) => void;

export const EDITOR_STORAGE_KEY = 'threadnotes.editor.tabs';

const PERSIST_DELAY_MS = 150;

export function normalizeContentType(value: unknown): NoteContentType {
  return value === 'code' ? 'code' : 'text';
}

export function contentTypeOf(tab: { contentType?: NoteContentType | undefined }): NoteContentType {
  return normalizeContentType(tab.contentType);
}

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
    (value['contentType'] === undefined ||
      value['contentType'] === 'text' ||
      value['contentType'] === 'code') &&
    (value['savedContentType'] === undefined ||
      value['savedContentType'] === 'text' ||
      value['savedContentType'] === 'code') &&
    (value['target'] === null || isTarget(value['target']))
  );
}

function isChainNoteTab(value: unknown): value is ChainNoteTab {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['content'] === 'string' &&
    (value['contentType'] === undefined ||
      value['contentType'] === 'text' ||
      value['contentType'] === 'code')
  );
}

function createBlankNoteTab(): ChainNoteTab {
  return { id: generateId(), content: '', contentType: 'text' };
}

function cloneNoteTab(noteTab: ChainNoteTab): ChainNoteTab {
  return { ...noteTab, contentType: contentTypeOf(noteTab) };
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
  if (tab.kind === 'chain') return tab.noteTabs.some(isChainNoteTabDirty);

  const savedType = normalizeContentType(tab.savedContentType);
  const typeChanged = tab.target !== null && contentTypeOf(tab) !== savedType;
  return tab.content !== tab.savedContent || typeChanged;
}

export class EditorStore {
  private tabs: EditorTab[] = [];
  private activeTabId: string | null = null;
  private listeners = new Set<Listener>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly storage: Storage | null = getSessionStorage(),
    private readonly pendingCache: PendingDraftsCache | null = null
  ) {
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
      contentType: 'text',
      savedContent: '',
      savedContentType: 'text',
      target: null,
    };

    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this.persist();
    this.notify();
    return cloneTab(tab) as DraftTab;
  }

  openChainTab(
    chainId: string,
    title: string,
    options: { composerCollapsed?: boolean } = {}
  ): ChainTab {
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
      composerCollapsed: options.composerCollapsed ?? false,
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

  updateChainNoteContentType(
    chainTabId: string,
    noteTabId: string,
    contentType: NoteContentType
  ): void {
    const tab = this.tabs.find((item) => item.id === chainTabId);
    if (!tab || tab.kind !== 'chain') return;
    const noteTab = tab.noteTabs.find((item) => item.id === noteTabId);
    if (!noteTab || contentTypeOf(noteTab) === contentType) return;

    noteTab.contentType = contentType;
    this.persist();
    this.notify();
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

  updateDraftContentType(id: string, contentType: NoteContentType): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'draft' || contentTypeOf(tab) === contentType) return;

    tab.contentType = contentType;
    this.persist();
    this.notify();
  }

  setChainTabStatus(id: string, status: ChainTab['status']): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'chain') return;
    tab.status = status;
    this.notify();
  }

  setChainComposerCollapsed(id: string, collapsed: boolean): void {
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'chain' || tab.composerCollapsed === collapsed) return;
    tab.composerCollapsed = collapsed;
    this.persist();
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
    this.appendNotesToChainTab(id, [note]);
  }

  appendNotesToChainTab(id: string, notes: NoteDTO[]): void {
    if (notes.length === 0) return;
    const tab = this.tabs.find((item) => item.id === id);
    if (!tab || tab.kind !== 'chain') return;
    tab.notes = [...tab.notes, ...notes.map(cloneNote)];
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
    tab.savedContentType = contentTypeOf(tab);
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
    const sessionRaw = this.storage?.getItem(EDITOR_STORAGE_KEY) ?? null;
    const restored = this.restoreFromRaw(sessionRaw)
      ? true
      : this.restoreFromRaw(this.pendingCache?.read() ?? null);

    if (restored) this.pendingCache?.write(this.getSnapshot());
  }

  private restoreFromRaw(raw: string | null): boolean {
    if (!raw) return false;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || !Array.isArray(parsed['tabs'])) return false;

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
            contentType: normalizeContentType(rawTab.contentType),
            savedContent: rawTab.savedContent,
            savedContentType: normalizeContentType(rawTab.savedContentType),
            target: rawTab.target ? { ...rawTab.target } : null,
          });
        }
      }

      if (restored.length === 0) return false;

      this.tabs = restored;
      const savedActiveId =
        typeof parsed['activeTabId'] === 'string' ? parsed['activeTabId'] : null;
      this.activeTabId = restored.some((tab) => tab.id === savedActiveId)
        ? savedActiveId
        : restored[0]!.id;
      return true;
    } catch {
      return false;
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
        : [{ id: generateId(), content: legacyComposer, contentType: 'text' as const }];
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
      composerCollapsed: raw['composerCollapsed'] === true,
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
    const snapshot = this.getSnapshot();
    this.writeSession(snapshot);
    this.pendingCache?.write(snapshot);
  }

  private writeSession(snapshot: EditorSnapshot): void {
    if (!this.storage) return;

    try {
      if (snapshot.tabs.length === 0) {
        this.storage.removeItem(EDITOR_STORAGE_KEY);
        return;
      }

      const tabs = snapshot.tabs.map((tab) =>
        tab.kind === 'draft'
          ? tab
          : {
              kind: 'chain',
              id: tab.id,
              chainId: tab.chainId,
              title: tab.title,
              noteTabs: tab.noteTabs,
              activeNoteTabId: tab.activeNoteTabId,
              composerCollapsed: tab.composerCollapsed,
            }
      );

      this.storage.setItem(
        EDITOR_STORAGE_KEY,
        JSON.stringify({
          tabs,
          activeTabId: snapshot.activeTabId,
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

export const editorStore = new EditorStore(getSessionStorage(), new PendingDraftsCache());
