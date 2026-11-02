import { AppController } from '../pages/AppController.js';
import { appState } from '../state/AppState.js';
import { showComposerModal } from '../views/menus.js';

export interface GlobalShortcutActions {
  openSearch: () => void;
  openBlankDocument: () => void;
  openNewCollection: () => void;
  leaveSearch: () => void;
  isDialogOpen: () => boolean;
  isSearchView: () => boolean;
}

function isEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

export function handleGlobalShortcut(
  event: KeyboardEvent,
  actions: GlobalShortcutActions
): boolean {
  if (event.defaultPrevented) return false;

  const modifier = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (modifier && !event.altKey && key === 'k') {
    event.preventDefault();
    actions.openSearch();
    return true;
  }

  if (!modifier && !event.altKey && !event.isComposing && key === 'n') {
    if (event.repeat || isEditingTarget(event.target) || actions.isDialogOpen()) {
      return false;
    }

    event.preventDefault();
    if (event.shiftKey) {
      actions.openNewCollection();
    } else {
      actions.openBlankDocument();
    }
    return true;
  }

  if (
    event.key === 'Escape' &&
    !isEditingTarget(event.target) &&
    !actions.isDialogOpen() &&
    actions.isSearchView()
  ) {
    event.preventDefault();
    actions.leaveSearch();
    return true;
  }

  return false;
}

const defaultActions: GlobalShortcutActions = {
  openSearch: () => {
    appState.set({ searchQuery: '', searchResults: [] });
    void AppController.navigateTo('search');
  },
  openBlankDocument: () => {
    AppController.openBlankDocument();
  },
  openNewCollection: () => {
    showComposerModal();
  },
  leaveSearch: () => {
    void AppController.navigateTo('editor');
  },
  isDialogOpen: () => document.querySelector('.dialog-backdrop') !== null,
  isSearchView: () => appState.get().view === 'search',
};

let detach: (() => void) | null = null;

export function initGlobalShortcuts(actions: GlobalShortcutActions = defaultActions): () => void {
  detach?.();

  const listener = (event: KeyboardEvent): void => {
    handleGlobalShortcut(event, actions);
  };

  document.addEventListener('keydown', listener);

  const remove = (): void => {
    document.removeEventListener('keydown', listener);
    if (detach === remove) detach = null;
  };

  detach = remove;
  return remove;
}
