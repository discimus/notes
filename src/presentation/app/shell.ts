import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { el } from '../dom.js';
import { initTheme } from './theme.js';
import { initNavigationHistory } from './navigation.js';
import { AppController } from '../pages/AppController.js';
import { initNavResponsive, renderNavDrawer, updateNavDrawer } from '../views/nav.js';
import { updateTopbar } from '../views/topbar.js';
import { renderChainsLayout, updateChainsLayout } from '../views/chains.js';
import { renderSearchLayout, updateSearchLayout } from '../views/search.js';
import { renderTimelineLayout, updateTimelineLayout } from '../views/timeline.js';
import { renderTagsLayout, updateTagsLayout } from '../views/tags.js';
import { showComposerModal } from '../views/menus.js';
import { initEditorSession, mountEditorView } from '../views/editor.js';

export function renderApp(root: HTMLElement): void {
  initTheme();
  initEditorSession();
  root.innerHTML = '';

  const shell = el('div', 'app-shell');

  const nav = el('nav', 'app-nav');
  nav.setAttribute('aria-label', 'Navegação principal');
  nav.appendChild(renderNavDrawer());
  shell.appendChild(nav);

  const main = el('main', 'app-main');
  main.setAttribute('id', 'main-content');

  const topbar = el('header', 'app-topbar');
  topbar.setAttribute('id', 'app-topbar');
  main.appendChild(topbar);

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
    updateNavDrawer(state);
    updateTopbar(topbar, state);
    contentCleanup = updateContent(content, state, contentCleanup);
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
  fab.hidden = !(state.view === 'chains' || state.view === 'favorites');
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
    } else if (newView === 'chains' || newView === 'favorites' || newView === 'archived' || newView === 'trash') {
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
    if (newView === 'chains' || newView === 'chain-detail' || newView === 'favorites' || newView === 'archived' || newView === 'trash') {
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
