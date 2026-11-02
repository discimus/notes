import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { el } from '../dom.js';
import { initTheme } from './theme.js';
import { initCompactMode } from './compactMode.js';
import { initNoteContentDisplay } from './noteContentDisplay.js';
import { initNoteImageLayout } from './noteImageLayout.js';
import { initPinnedChains } from './pinnedChains.js';
import { initNavigationHistory } from './navigation.js';
import { AppController } from '../pages/AppController.js';
import { initNavResponsive, renderNavDrawer, updateNavDrawer } from '../views/nav.js';
import { renderChainsLayout, updateChainsLayout } from '../views/chains.js';
import { renderSearchLayout, updateSearchLayout } from '../views/search.js';
import { renderTimelineLayout, updateTimelineLayout } from '../views/timeline.js';
import { renderTagsLayout, updateTagsLayout } from '../views/tags.js';
import { showComposerModal } from '../views/menus.js';
import { initEditorSession, mountEditorView } from '../views/editor.js';

export function renderApp(root: HTMLElement): void {
  initTheme();
  initCompactMode();
  initNoteContentDisplay();
  initNoteImageLayout();
  initPinnedChains();
  initEditorSession();
  root.innerHTML = '';

  const shell = el('div', 'app-shell');

  const nav = el('nav', 'app-nav');
  nav.setAttribute('aria-label', 'Navegação principal');
  nav.appendChild(renderNavDrawer());
  shell.appendChild(nav);

  const main = el('main', 'app-main');
  main.setAttribute('id', 'main-content');

  const viewTitle = el('h1', 'sr-only');
  viewTitle.id = 'app-view-title';
  viewTitle.textContent = 'Notes';
  main.setAttribute('aria-labelledby', viewTitle.id);
  main.appendChild(viewTitle);

  const content = el('div', 'app-content');
  content.setAttribute('id', 'app-content');
  main.appendChild(content);

  const fab = el('button', 'fab fab--fixed');
  fab.id = 'fab-new-chain';
  fab.setAttribute('aria-label', 'Nova cadeia');
  fab.setAttribute('title', 'Nova cadeia (N)');
  fab.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">add</span>';
  fab.addEventListener('click', () => showComposerModal());
  main.appendChild(fab);

  shell.appendChild(main);
  root.appendChild(shell);

  let contentCleanup: (() => void) | null = null;

  const applyState = (state: AppState) => {
    shell.classList.toggle('app-shell--compact', state.compactMode);
    shell.classList.toggle('app-shell--full-note-content', state.fullNoteContent);
    shell.classList.toggle(
      'app-shell--image-column',
      state.noteImageLayout === 'column'
    );
    updateViewTitle(viewTitle, state);
    contentCleanup = updateContent(content, state, contentCleanup);
    updateNavDrawer(state);
    updateFab(fab, state);
  };

  let scheduled = false;
  let pendingState: AppState | null = null;
  const scheduleRender = (state: AppState) => {
    pendingState = state;
    if (scheduled) return;
    scheduled = true;

    const run = () => {
      scheduled = false;
      const next = pendingState;
      pendingState = null;
      if (next) applyState(next);
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  };

  appState.subscribe(scheduleRender);
  initNavigationHistory(appState.get().view, (view, chainId) => AppController.navigateTo(view, chainId));
  initNavResponsive();

  const state = appState.get();
  applyState(state);
}

function updateFab(fab: HTMLElement, state: AppState): void {
  fab.hidden = state.view !== 'chains';
}

function updateViewTitle(element: HTMLElement, state: AppState): void {
  if (state.view === 'editor') element.textContent = 'Editor';
  else if (state.view === 'chains') element.textContent = 'Todas as cadeias';
  else if (state.view === 'archived') element.textContent = 'Arquivo';
  else if (state.view === 'trash') element.textContent = 'Lixeira';
  else if (state.view === 'tags') element.textContent = 'Tags';
  else if (state.view === 'timeline') element.textContent = 'Visualização cronológica';
  else if (state.view === 'search') element.textContent = `Pesquisa: "${state.searchQuery}"`;
  else if (state.view === 'chain-detail' && state.currentChain) {
    element.textContent = state.currentChain.displayTitle;
  } else {
    element.textContent = 'Notes';
  }
}

function updateContent(
  content: HTMLElement,
  state: AppState,
  cleanup: (() => void) | null
): (() => void) | null {
  content.setAttribute('aria-busy', state.isLoading ? 'true' : 'false');

  const currentViewAttr = content.getAttribute('data-view');
  const newView = state.view;

  if (currentViewAttr !== newView) {
    cleanup?.();
    cleanup = null;
    content.setAttribute('data-view', newView);
    content.innerHTML = '';

    if (newView === 'editor') {
      cleanup = mountEditorView(content);
    } else if (newView === 'chains' || newView === 'archived' || newView === 'trash') {
      content.appendChild(renderChainsLayout(state));
    } else if (newView === 'chain-detail') {
      content.appendChild(renderChainsLayout(state));
    } else if (newView === 'search') {
      content.appendChild(renderSearchLayout(state));
    } else if (newView === 'timeline') {
      content.appendChild(renderTimelineLayout(state));
    } else if (newView === 'tags') {
      content.appendChild(renderTagsLayout(state));
    }
  } else {
    if (newView === 'chains' || newView === 'chain-detail' || newView === 'archived' || newView === 'trash') {
      updateChainsLayout(content, state);
    } else if (newView === 'search') {
      updateSearchLayout(content, state);
    } else if (newView === 'timeline') {
      updateTimelineLayout(content, state);
    } else if (newView === 'tags') {
      updateTagsLayout(content, state);
    }
  }

  return cleanup;
}
