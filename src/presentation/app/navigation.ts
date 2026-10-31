import type { AppView } from '../state/AppState.js';

interface NavigationState {
  view: AppView;
  chainId?: string;
}

let suppressPush = false;

export function pushNavigation(view: AppView, chainId?: string): void {
  if (suppressPush) return;

  const current = window.history.state as NavigationState | null;
  if (current?.view === view && current.chainId === chainId) return;

  const state: NavigationState = chainId ? { view, chainId } : { view };
  window.history.pushState(state, '');
}

export function initNavigationHistory(
  initialView: AppView,
  onNavigate: (view: AppView, chainId?: string) => void | Promise<void>
): void {
  window.history.replaceState({ view: initialView } satisfies NavigationState, '');

  window.addEventListener('popstate', (event) => {
    const state = event.state as NavigationState | null;
    if (!state?.view) return;

    suppressPush = true;
    void Promise.resolve(onNavigate(state.view, state.chainId)).finally(() => {
      suppressPush = false;
    });
  });
}
