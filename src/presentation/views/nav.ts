import { appState } from '../state/AppState.js';
import type { AppState, AppView } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { el, qs, qsa } from '../dom.js';
import { cycleTheme, themeIcon, themeLabel } from '../app/theme.js';
import { toggleCompactMode } from '../app/compactMode.js';
import { showSettingsDialog } from '../components/SettingsDialog.js';
import { syncNavToggles } from '../components/NavToggle.js';
import { showSearchPanel } from './search.js';

const COMPACT_NAV_QUERY = '(max-width: 768px)';
const DESKTOP_NAV_QUERY = '(min-width: 769px)';

let drawerEscapeBound = false;
let responsiveBound = false;

function isCompactNav(): boolean {
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(COMPACT_NAV_QUERY).matches;
  }
  return window.innerWidth <= 768;
}

function ensureDrawerEscape(): void {
  if (drawerEscapeBound) return;
  drawerEscapeBound = true;

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !appState.get().drawerOpen) return;
    event.preventDefault();
    appState.set({ drawerOpen: false });
    qs('#nav-overlay')?.remove();
  });
}

export function initNavResponsive(): void {
  if (responsiveBound || typeof window.matchMedia !== 'function') return;
  responsiveBound = true;

  const desktop = window.matchMedia(DESKTOP_NAV_QUERY);
  const closeDrawerOnDesktop = () => {
    if (!desktop.matches || !appState.get().drawerOpen) return;
    appState.set({ drawerOpen: false });
    qs('#nav-overlay')?.remove();
  };

  desktop.addEventListener('change', closeDrawerOnDesktop);
  closeDrawerOnDesktop();
}

export function renderNavDrawer(): HTMLElement {
  const drawer = el('div', 'nav-drawer');
  drawer.setAttribute('id', 'nav-drawer');

  const header = el('div', 'nav-drawer__header');
  header.innerHTML = `
    <div class="nav-drawer__logo" aria-label="ThreadNotes" title="ThreadNotes">
      <span class="material-symbols-rounded" aria-hidden="true">account_tree</span>
      <span>ThreadNotes</span>
    </div>
  `;
  drawer.appendChild(header);

  const content = el('div', 'nav-drawer__content');
  content.innerHTML = `
    <nav aria-label="Seções principais">
      <button class="nav-item nav-search" data-view="search" aria-label="Pesquisar" title="Pesquisar (Ctrl+K)">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">search</span>
        <span class="nav-item__label">Pesquisar</span>
      </button>
      <button class="nav-item nav-item--active" data-view="editor" aria-current="page" aria-label="Editor de texto" title="Editor de texto">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">edit_note</span>
        <span class="nav-item__label">Editor</span>
      </button>
      <button class="nav-item" data-view="tags" aria-label="Tags" title="Tags">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">label</span>
        <span class="nav-item__label">Tags</span>
      </button>
      <button class="nav-item" data-view="timeline" aria-label="Visualizações" title="Visualizações">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">timeline</span>
        <span class="nav-item__label">Timeline</span>
      </button>
    </nav>
    <hr class="nav-divider" />
    <nav aria-label="Gerenciamento">
      <button class="nav-item" data-view="archived" aria-label="Arquivo" title="Arquivo">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">archive</span>
        <span class="nav-item__label">Arquivo</span>
      </button>
      <button class="nav-item" data-view="trash" aria-label="Lixeira" title="Lixeira">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">delete</span>
        <span class="nav-item__label">Lixeira</span>
      </button>
    </nav>
  `;
  drawer.appendChild(content);

  const footer = el('div', 'nav-drawer__footer');
  footer.innerHTML = `
    <button class="nav-drawer__settings" id="compact-toggle" type="button" aria-label="Ativar modo compacto" title="Modo compacto" aria-pressed="false">
      <span class="nav-drawer__settings-icon material-symbols-rounded" aria-hidden="true">compress</span>
      <span class="nav-drawer__settings-label">Compactar</span>
    </button>
    <button class="nav-drawer__settings" id="settings-toggle" type="button" aria-label="Configurações" title="Configurações" aria-haspopup="dialog">
      <span class="nav-drawer__settings-icon material-symbols-rounded" aria-hidden="true">settings</span>
      <span class="nav-drawer__settings-label">Configurações</span>
    </button>
    <button class="nav-drawer__theme" id="theme-toggle" type="button" aria-label="Alternar tema" title="Alternar tema">
      <span class="nav-drawer__theme-icon material-symbols-rounded" aria-hidden="true">dark_mode</span>
      <span class="nav-drawer__theme-label">Tema</span>
    </button>
  `;
  drawer.appendChild(footer);

  return drawer;
}

export function updateNavDrawer(state: AppState): void {
  const drawer = qs('#nav-drawer');
  if (!drawer) return;

  ensureDrawerEscape();

  qsa('.nav-item', drawer).forEach((item) => {
    const view = (item as HTMLElement).dataset['view'];
    const isActive = view === state.view || (state.view === 'chain-detail' && view === 'chains');
    item.classList.toggle('nav-item--active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');

    if (!(item as HTMLElement).dataset['bound']) {
      (item as HTMLElement).dataset['bound'] = '1';
      item.addEventListener('click', () => {
        if (view === 'search') {
          showSearchPanel();
        } else if (view) {
          void AppController.navigateTo(view as AppView);
        }
        if (isCompactNav()) {
          appState.set({ drawerOpen: false });
          qs('#nav-overlay')?.remove();
        }
      });
    }
  });

  drawer.classList.toggle('nav-drawer--open', state.drawerOpen);
  syncNavToggles(state.drawerOpen);

  const compactBtn = qs('#compact-toggle', drawer);
  if (compactBtn) {
    const icon = compactBtn.querySelector<HTMLElement>('.material-symbols-rounded');
    const label = compactBtn.querySelector<HTMLElement>('.nav-drawer__settings-label');
    if (icon) icon.textContent = state.compactMode ? 'expand' : 'compress';
    if (label) label.textContent = state.compactMode ? 'Restaurar' : 'Compactar';
    compactBtn.setAttribute('aria-pressed', state.compactMode ? 'true' : 'false');
    compactBtn.setAttribute(
      'aria-label',
      state.compactMode ? 'Sair do modo compacto' : 'Ativar modo compacto'
    );
    compactBtn.setAttribute(
      'title',
      state.compactMode ? 'Sair do modo compacto' : 'Modo compacto'
    );

    if (!(compactBtn as HTMLElement).dataset['bound']) {
      (compactBtn as HTMLElement).dataset['bound'] = '1';
      compactBtn.addEventListener('click', () => {
        toggleCompactMode();
      });
    }
  }

  const settingsBtn = qs('#settings-toggle', drawer);
  if (settingsBtn && !(settingsBtn as HTMLElement).dataset['bound']) {
    (settingsBtn as HTMLElement).dataset['bound'] = '1';
    settingsBtn.addEventListener('click', () => showSettingsDialog());
  }

  const themeBtn = qs('#theme-toggle', drawer);
  if (themeBtn) {
    const icon = themeBtn.querySelector<HTMLElement>('.material-symbols-rounded');
    if (icon) icon.textContent = themeIcon(state.theme);
    themeBtn.setAttribute('aria-label', themeLabel(state.theme));
    themeBtn.setAttribute('title', themeLabel(state.theme));

    if (!(themeBtn as HTMLElement).dataset['bound']) {
      (themeBtn as HTMLElement).dataset['bound'] = '1';
      themeBtn.addEventListener('click', () => cycleTheme());
    }
  }
}
