import type {
  ChainSummaryDTO,
  ChainDetailDTO,
  NoteContentType,
  TagDTO,
  SearchResultDTO,
  TimelineEntryDTO,
} from '@application/dto/index.js';
import type { NoteImageLayout } from '../app/noteImageLayout.js';

/**
 * Estado global da aplicaÃ§Ã£o.
 * Leve store reativo baseado em eventos â€” sem dependÃªncias externas.
 */

export type AppView = 'editor' | 'chains' | 'chain-detail' | 'search' | 'timeline' | 'tags' | 'archived' | 'trash';

export interface TimelineFilters {
  query: string;
  from: string;
  to: string;
  tagIds: string[];
  contentTypes?: NoteContentType[] | undefined;
  tagMode?: 'any' | 'all' | undefined;
  sort?: 'newest' | 'oldest' | undefined;
}

export interface AppState {
  view: AppView;
  selectedChainId: string | null;
  chainSummaries: ChainSummaryDTO[];
  currentChain: ChainDetailDTO | null;
  allTags: TagDTO[];
  chainFilterQuery: string;
  searchQuery: string;
  searchResults: SearchResultDTO[];
  searchSelectedNoteId: string | null;
  editorFocusRequest: { noteId: string; query: string } | null;
  editorPreviewRequest: { noteId: string; query: string } | null;
  searchLoadedOffset: number;
  searchPageSize: number;
  searchHasMore: boolean;
  searchIsLoadingMore: boolean;
  timelineEntries: TimelineEntryDTO[];
  timelineTotal: number;
  timelineLoadedOffset: number;
  timelinePageSize: number;
  timelinePageIndex: number;
  timelineFilters: TimelineFilters;
  timelineIsLoadingMore: boolean;
  timelineSelectedChainIds: string[];
  timelinePreviewNoteId: string | null;
  isLoading: boolean;
  error: string | null;
  theme: 'light' | 'dark' | 'system';
  drawerOpen: boolean;
  chainsPanelVisible: boolean;
  compactMode: boolean;
  fullNoteContent: boolean;
  noteImageLayout: NoteImageLayout;
  pinnedChainIds: string[];
}

type Listener = (state: AppState) => void;

class AppStateStore {
  private state: AppState = {
    view: 'editor',
    selectedChainId: null,
    chainSummaries: [],
    currentChain: null,
    allTags: [],
    chainFilterQuery: '',
    searchQuery: '',
    searchResults: [],
    searchSelectedNoteId: null,
    editorFocusRequest: null,
    editorPreviewRequest: null,
    searchLoadedOffset: 0,
    searchPageSize: 10,
    searchHasMore: false,
    searchIsLoadingMore: false,
    timelineEntries: [],
    timelineTotal: 0,
    timelineLoadedOffset: 0,
    timelinePageSize: 50,
    timelinePageIndex: 0,
    timelineFilters: {
      query: '',
      from: '',
      to: '',
      tagIds: [],
      contentTypes: [],
      tagMode: 'any',
      sort: 'newest',
    },
    timelineIsLoadingMore: false,
    timelineSelectedChainIds: [],
    timelinePreviewNoteId: null,
    isLoading: false,
    error: null,
    theme: 'system',
    drawerOpen: false,
    chainsPanelVisible: true,
    compactMode: false,
    fullNoteContent: false,
    noteImageLayout: 'thumbnails',
    pinnedChainIds: [],
  };

  private listeners = new Set<Listener>();

  get(): AppState {
    return { ...this.state };
  }

  set(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.get();
    this.listeners.forEach((l) => l(snapshot));
  }
}

export const appState = new AppStateStore();
