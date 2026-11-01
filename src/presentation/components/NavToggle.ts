import { appState } from '../state/AppState.js';
import { el, qs } from '../dom.js';

function removeOverlay(): void {
  qs('#nav-overlay')?.remove();
}

export function toggleNavDrawer(): void {
  const open = !appState.get().drawerOpen;
  appState.set({ drawerOpen: open });

  if (!open) {
    removeOverlay();
    return;
  }

  const overlay = el('div', 'nav-drawer-overlay');
  overlay.id = 'nav-overlay';
  overlay.addEventListener('click', () => {
    appState.set({ drawerOpen: false });
    overlay.remove();
  });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    qs('#nav-drawer .nav-item')?.focus();
  });
}

export function syncNavToggles(open: boolean): void {
  document.querySelectorAll<HTMLButtonElement>('.nav-toggle').forEach((toggle) => {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    toggle.title = open ? 'Fechar menu de navegação' : 'Menu de navegação';
  });
}

export function renderNavToggle(): HTMLButtonElement {
  const toggle = el('button', 'btn-icon nav-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'nav-drawer');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir menu de navegação');
  toggle.title = 'Menu de navegação';
  toggle.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">menu</span>';
  toggle.addEventListener('click', () => toggleNavDrawer());
  return toggle;
}
