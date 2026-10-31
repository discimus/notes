import type { ChainSummaryDTO, ChainDetailDTO, TagDTO, SearchResultDTO, TimelineDTO } from '../../application/dto/index.js';

/**
 * Estado global da aplicação.
 * Leve store reativo baseado em eventos — sem dependências externas.
 */

export type AppView = 'chains' | 'chain-detail' | 'search' | 'timeline' | 'tags' | 'favorites' | 'archived' | 'trash';

export interface AppState {
  view: AppView;
  selectedChainId: string | null;
  chainSummaries: ChainSummaryDTO[];
  currentChain: ChainDetailDTO | null;
  allTags: TagDTO[];
  searchQuery: string;
  searchResults: SearchResultDTO[];
  timeline: TimelineDTO | null;
  timelineSelectedChainIds: string[];
  isLoading: boolean;
  error: string | null;
  theme: 'light' | 'dark' | 'system';
  drawerOpen: boolean;
  chainsPanelVisible: boolean;
}

type Listener = (state: AppState) => void;

class AppStateStore {
  private state: AppState = {
    view: 'chains',
    selectedChainId: null,
    chainSummaries: [],
    currentChain: null,
    allTags: [],
    searchQuery: '',
    searchResults: [],
    timeline: null,
    timelineSelectedChainIds: [],
    isLoading: false,
    error: null,
    theme: 'system',
    drawerOpen: false,
    chainsPanelVisible: true,
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
