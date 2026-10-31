import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { AppController } from './AppController.js';
import { DraftStore } from '../state/DraftStore.js';
import { snackbar } from '../components/Snackbar.js';
import { showInputDialog } from '../components/Dialog.js';
import { formatDate, formatTime, formatDateFull, escapeHtml, highlightMatch, debounce } from '../../shared/utilities/index.js';
import type { ChainSummaryDTO, NoteDTO, TagDTO } from '../../application/dto/index.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function qs<T extends Element = HTMLElement>(selector: string, parent: Element | Document = document): T | null {
  return parent.querySelector<T>(selector);
}
function qsa<T extends Element = HTMLElement>(selector: string, parent: Element | Document = document): T[] {
  return [...parent.querySelectorAll<T>(selector)];
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

// ── Top-level render ───────────────────────────────────────────────────────

export function renderApp(root: HTMLElement): void {
  root.innerHTML = '';

  const shell = el('div', 'app-shell');

  // Nav drawer
  const nav = el('nav', 'app-nav');
  nav.setAttribute('aria-label', 'Navegação principal');
  nav.appendChild(renderNavDrawer());
  shell.appendChild(nav);

  // Main
  const main = el('main', 'app-main');
  main.setAttribute('id', 'main-content');

  const topbar = el('header', 'app-topbar');
  topbar.setAttribute('id', 'app-topbar');
  main.appendChild(topbar);

  const content = el('div', 'app-content');
  content.setAttribute('id', 'app-content');
  main.appendChild(content);

  shell.appendChild(main);
  root.appendChild(shell);

  // Inscreve no estado para re-renderizar
  appState.subscribe((state) => {
    updateNavDrawer(state);
    updateTopbar(topbar, state);
    updateContent(content, state);
  });

  // Render inicial
  const state = appState.get();
  updateNavDrawer(state);
  updateTopbar(topbar, state);
  updateContent(content, state);
}

// ── Navigation Drawer ──────────────────────────────────────────────────────

function renderNavDrawer(): HTMLElement {
  const drawer = el('div', 'nav-drawer');
  drawer.setAttribute('id', 'nav-drawer');

  const header = el('div', 'nav-drawer__header');
  header.innerHTML = `
    <div class="nav-drawer__logo" aria-label="ThreadNotes">
      <span class="material-symbols-rounded" aria-hidden="true">account_tree</span>
      <span>ThreadNotes</span>
    </div>
    <button class="btn-icon" id="theme-toggle" aria-label="Alternar tema" title="Alternar tema">
      <span class="material-symbols-rounded">dark_mode</span>
    </button>
  `;
  drawer.appendChild(header);

  const content = el('div', 'nav-drawer__content');
  content.innerHTML = `
    <nav aria-label="Seções principais">
      <button class="nav-item nav-item--active" data-view="chains" aria-current="page">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">notes</span>
        <span class="nav-item__label">Todas as cadeias</span>
      </button>
      <button class="nav-item" data-view="favorites">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">star</span>
        <span class="nav-item__label">Favoritos</span>
      </button>
      <button class="nav-item" data-view="tags">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">label</span>
        <span class="nav-item__label">Tags</span>
      </button>
      <button class="nav-item" data-view="timeline">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">timeline</span>
        <span class="nav-item__label">Visualizações</span>
      </button>
    </nav>
    <hr class="nav-divider" />
    <nav aria-label="Gerenciamento">
      <button class="nav-item" data-view="archived">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">archive</span>
        <span class="nav-item__label">Arquivo</span>
      </button>
      <button class="nav-item" data-view="trash">
        <span class="nav-item__icon material-symbols-rounded" aria-hidden="true">delete</span>
        <span class="nav-item__label">Lixeira</span>
      </button>
    </nav>
  `;
  drawer.appendChild(content);

  return drawer;
}

function updateNavDrawer(state: AppState): void {
  const drawer = qs('#nav-drawer');
  if (!drawer) return;

  // Atualiza active
  qsa('.nav-item', drawer).forEach((item) => {
    const view = (item as HTMLElement).dataset['view'];
    const isActive = view === state.view || (state.view === 'chain-detail' && view === 'chains');
    item.classList.toggle('nav-item--active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');

    if (!(item as HTMLElement).dataset['bound']) {
      (item as HTMLElement).dataset['bound'] = '1';
      item.addEventListener('click', () => {
        if (view) AppController.navigateTo(view as import('../state/AppState.js').AppView);
        // Fecha drawer no mobile
        if (window.innerWidth < 768) {
          drawer.classList.remove('nav-drawer--open');
          qs('#nav-overlay')?.remove();
        }
      });
    }
  });

  // Mobile drawer state
  drawer.classList.toggle('nav-drawer--open', state.drawerOpen);

  // Theme toggle
  const themeBtn = qs('#theme-toggle', drawer);
  if (themeBtn && !(themeBtn as HTMLElement).dataset['bound']) {
    (themeBtn as HTMLElement).dataset['bound'] = '1';
    themeBtn.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme') ?? 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      appState.set({ theme: next as 'light' | 'dark' });
      (themeBtn.querySelector('.material-symbols-rounded') as HTMLElement).textContent =
        next === 'dark' ? 'light_mode' : 'dark_mode';
    });
  }
}

// ── Topbar ─────────────────────────────────────────────────────────────────

function updateTopbar(topbar: HTMLElement, state: AppState): void {
  topbar.innerHTML = '';

  // Menu burger (mobile)
  const burger = el('button', 'btn-icon');
  burger.setAttribute('aria-label', 'Abrir menu de navegação');
  burger.setAttribute('aria-expanded', state.drawerOpen ? 'true' : 'false');
  burger.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">menu</span>';
  burger.addEventListener('click', () => {
    const next = !appState.get().drawerOpen;
    appState.set({ drawerOpen: next });
    if (next) {
      const overlay = el('div', 'nav-drawer-overlay');
      overlay.id = 'nav-overlay';
      overlay.addEventListener('click', () => {
        appState.set({ drawerOpen: false });
        overlay.remove();
      });
      document.body.appendChild(overlay);
    } else {
      qs('#nav-overlay')?.remove();
    }
  });
  topbar.appendChild(burger);

  // Título
  const title = el('h1', 'app-topbar__title');
  if (state.view === 'chains') title.textContent = 'Todas as cadeias';
  else if (state.view === 'favorites') title.textContent = 'Favoritos';
  else if (state.view === 'archived') title.textContent = 'Arquivo';
  else if (state.view === 'trash') title.textContent = 'Lixeira';
  else if (state.view === 'tags') title.textContent = 'Tags';
  else if (state.view === 'timeline') title.textContent = 'Visualização cronológica';
  else if (state.view === 'search') title.textContent = `Pesquisa: "${state.searchQuery}"`;
  else if (state.view === 'chain-detail' && state.currentChain) {
    title.textContent = state.currentChain.displayTitle;
  } else {
    title.textContent = 'ThreadNotes';
  }
  topbar.appendChild(title);

  // Ações
  const actions = el('div', 'app-topbar__actions');

  // Search
  const searchBtn = el('button', 'btn-icon');
  searchBtn.setAttribute('aria-label', 'Pesquisar');
  searchBtn.setAttribute('title', 'Pesquisar (Ctrl+K)');
  searchBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">search</span>';
  searchBtn.addEventListener('click', () => showSearchPanel());
  actions.appendChild(searchBtn);

  if (state.view === 'chain-detail' && state.currentChain) {
    const moreBtn = el('button', 'btn-icon');
    moreBtn.setAttribute('aria-label', 'Mais opções');
    moreBtn.setAttribute('title', 'Mais opções');
    moreBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">more_vert</span>';
    moreBtn.addEventListener('click', (e) => showChainMenu(e, state.currentChain!.id));
    actions.appendChild(moreBtn);
  }

  topbar.appendChild(actions);
}

// ── Content Area ───────────────────────────────────────────────────────────

function updateContent(content: HTMLElement, state: AppState): void {
  // Evita re-renders desnecessários de estrutura
  const currentViewAttr = content.getAttribute('data-view');
  const newView = state.view;

  if (currentViewAttr !== newView) {
    content.setAttribute('data-view', newView);
    content.innerHTML = '';

    if (newView === 'chains' || newView === 'favorites' || newView === 'archived' || newView === 'trash') {
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
    // Atualiza partes específicas sem reconstruir tudo
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
}

// ── Chains Layout ──────────────────────────────────────────────────────────

function renderChainsLayout(state: AppState): HTMLElement {
  const layout = el('div', 'chains-layout');
  layout.style.cssText = 'display:flex;flex:1;overflow:hidden;width:100%;';

  // Panel esquerda
  const panel = el('div', 'chains-panel');
  panel.setAttribute('id', 'chains-panel');
  panel.setAttribute('aria-label', 'Lista de cadeias');

  const panelHeader = el('div', 'chains-panel__header');

  // Search bar
  const searchBar = el('div', 'search-bar');
  searchBar.innerHTML = `
    <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
    <input type="search" class="search-bar__input" id="chains-search-input"
      placeholder="Pesquisar…" aria-label="Pesquisar cadeias" autocomplete="off" />
  `;
  panelHeader.appendChild(searchBar);

  // Toolbar
  const toolbar = el('div', 'chains-panel__toolbar');
  const titleSpan = el('span', 'chains-panel__title');
  titleSpan.textContent = getViewLabel(state.view);
  toolbar.appendChild(titleSpan);

  if (state.view === 'chains' || state.view === 'chain-detail') {
    const newBtn = el('button', 'btn-icon btn-icon--primary');
    newBtn.setAttribute('aria-label', 'Nova cadeia (N)');
    newBtn.setAttribute('title', 'Nova cadeia (N)');
    newBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">add</span>';
    newBtn.addEventListener('click', () => showComposerModal());
    toolbar.appendChild(newBtn);
  }
  panelHeader.appendChild(toolbar);
  panel.appendChild(panelHeader);

  const list = el('div', 'chains-panel__list');
  list.setAttribute('id', 'chains-list');
  list.setAttribute('role', 'list');
  panel.appendChild(list);

  layout.appendChild(panel);

  // Detail panel
  const detail = el('div', 'detail-panel');
  detail.setAttribute('id', 'detail-panel');
  layout.appendChild(detail);

  // Bind search
  const searchInput = searchBar.querySelector<HTMLInputElement>('#chains-search-input')!;
  const debouncedSearch = debounce((e: unknown) => {
    const query = (e as Event).target instanceof HTMLInputElement
      ? ((e as Event).target as HTMLInputElement).value
      : '';
    if (query.trim()) {
      AppController.search(query);
    }
  }, 350);
  searchInput.addEventListener('input', debouncedSearch as EventListener);

  // Render inicial
  renderChainsList(list, state);
  renderDetailPanel(detail, state);

  return layout;
}

function updateChainsLayout(content: HTMLElement, state: AppState): void {
  const list = qs('#chains-list', content);
  const detail = qs('#detail-panel', content);
  if (list) renderChainsList(list, state);
  if (detail) renderDetailPanel(detail, state);
}

function getViewLabel(view: string): string {
  const map: Record<string, string> = {
    chains: 'Cadeias',
    'chain-detail': 'Cadeias',
    favorites: 'Favoritos',
    archived: 'Arquivo',
    trash: 'Lixeira',
  };
  return map[view] ?? 'Cadeias';
}

function renderChainsList(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';

  if (state.isLoading && state.chainSummaries.length === 0) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (state.chainSummaries.length === 0) {
    container.appendChild(renderEmptyChains(state.view));
    return;
  }

  state.chainSummaries.forEach((chain) => {
    const card = renderChainCard(chain, state.selectedChainId === chain.id);
    container.appendChild(card);
  });
}

function renderChainCard(chain: ChainSummaryDTO, isActive: boolean): HTMLElement {
  const card = el('div', `chain-card${isActive ? ' chain-card--active' : ''}`);
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Cadeia: ${chain.displayTitle}`);
  card.setAttribute('aria-selected', isActive ? 'true' : 'false');

  card.innerHTML = `
    <div class="chain-card__header">
      <span class="chain-card__title truncate">${escapeHtml(chain.displayTitle)}</span>
      ${chain.isFavorite ? '<span class="chain-card__favorite material-symbols-rounded filled" aria-label="Favorito">star</span>' : ''}
    </div>
    ${chain.headerExcerpt ? `<p class="chain-card__excerpt">${escapeHtml(chain.headerExcerpt)}</p>` : ''}
    <div class="chain-card__footer">
      <span class="chain-card__meta">${formatDate(chain.updatedAt)} · ${chain.noteCount} nota${chain.noteCount !== 1 ? 's' : ''}</span>
      ${chain.tags.length > 0 ? `<div class="chain-card__tags" aria-label="Tags">${chain.tags.slice(0, 3).map(t => `<span class="chain-card__tag">${escapeHtml(t.name)}</span>`).join('')}</div>` : ''}
    </div>
  `;

  card.addEventListener('click', () => AppController.openChain(chain.id));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); AppController.openChain(chain.id); }
  });

  return card;
}

function renderDetailPanel(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';

  if (state.view === 'chain-detail' && state.currentChain) {
    const chain = state.currentChain;

    // Header
    const header = el('div', 'detail-panel__header');

    const titleEl = el('h2', 'detail-panel__title');
    titleEl.setAttribute('contenteditable', 'true');
    titleEl.setAttribute('aria-label', 'Título da cadeia');
    titleEl.setAttribute('spellcheck', 'true');
    titleEl.setAttribute('role', 'textbox');
    titleEl.setAttribute('aria-multiline', 'false');
    titleEl.textContent = chain.displayTitle;

    let titleDebounce: ReturnType<typeof setTimeout> | null = null;
    titleEl.addEventListener('input', () => {
      if (titleDebounce) clearTimeout(titleDebounce);
      titleDebounce = setTimeout(() => {
        const newTitle = titleEl.textContent?.trim() ?? '';
        if (newTitle !== chain.displayTitle) {
          AppController.updateChainTitle(chain.id, newTitle || undefined);
        }
      }, 800);
    });
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    });
    header.appendChild(titleEl);

    // Tags row
    const tagsRow = el('div', 'detail-panel__tags');
    tagsRow.setAttribute('aria-label', 'Tags da cadeia');
    chain.tags.forEach((tag) => {
      const chip = renderTagChip(tag, () => AppController.removeTag(chain.id, tag.id));
      tagsRow.appendChild(chip);
    });
    // Botão adicionar tag
    const addTagBtn = el('button', 'chip');
    addTagBtn.setAttribute('aria-label', 'Adicionar tag');
    addTagBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true" style="font-size:16px">add</span> Tag';
    addTagBtn.addEventListener('click', async () => {
      const name = await showInputDialog({
        title: 'Adicionar tag',
        label: 'Nome da tag',
        placeholder: 'ex: projeto',
        confirmLabel: 'Adicionar',
      });
      if (name) AppController.assignTag(chain.id, name);
    });
    tagsRow.appendChild(addTagBtn);
    header.appendChild(tagsRow);

    container.appendChild(header);

    // Notes
    const notesContainer = el('div', 'detail-panel__notes');
    notesContainer.setAttribute('id', 'notes-list');
    notesContainer.setAttribute('aria-label', 'Notas da cadeia');

    if (state.isLoading) {
      notesContainer.appendChild(renderLoadingState());
    } else {
      chain.notes.forEach((note, idx) => {
        notesContainer.appendChild(renderNoteThread(note, idx, chain.notes.length, chain.id));
      });
    }
    container.appendChild(notesContainer);

    // Compositor
    container.appendChild(renderComposer(chain.id));

  } else if (state.view === 'chains' || state.view === 'favorites') {
    container.appendChild(renderEmptyDetail());
  } else if (state.view === 'archived') {
    container.appendChild(renderEmptyDetail('archive', 'Arquivo', 'Selecione uma cadeia arquivada para visualizá-la.'));
  } else if (state.view === 'trash') {
    container.appendChild(renderEmptyDetail('delete', 'Lixeira', 'Selecione uma cadeia na lixeira para gerenciá-la.'));
  }
}

function renderNoteThread(note: NoteDTO, idx: number, total: number, chainId: string): HTMLElement {
  const wrapper = el('div', 'note-thread');
  wrapper.setAttribute('data-note-id', note.id);

  const indicator = el('div', 'note-thread__indicator');
  const dot = el('div', `note-thread__dot note-thread__dot--${note.role}`);

  if (note.role === 'header') {
    dot.innerHTML = '<span class="material-symbols-rounded" aria-label="Header">push_pin</span>';
  } else {
    dot.innerHTML = '<span class="material-symbols-rounded" aria-label="Tail">circle</span>';
  }
  indicator.appendChild(dot);

  // Linha vertical
  if (idx < total - 1) {
    const line = el('div', 'note-thread__line');
    line.setAttribute('aria-hidden', 'true');
    indicator.appendChild(line);
  }
  wrapper.appendChild(indicator);

  const contentDiv = el('div', 'note-thread__content');

  const textEl = el('p', `note-thread__text note-thread__text--${note.role}`);
  textEl.textContent = note.content;
  contentDiv.appendChild(textEl);

  const meta = el('div', 'note-thread__meta');
  meta.innerHTML = `
    <time datetime="${note.createdAt}" title="${formatDateFull(note.createdAt)}">${formatDate(note.createdAt)}</time>
    ${note.updatedAt !== note.createdAt ? `<span aria-label="Editado">· editado ${formatDate(note.updatedAt)}</span>` : ''}
    <div class="note-thread__actions" role="group" aria-label="Ações da nota">
      <button class="btn-icon" title="Editar nota" aria-label="Editar nota" data-action="edit">
        <span class="material-symbols-rounded" aria-hidden="true">edit</span>
      </button>
    </div>
  `;
  contentDiv.appendChild(meta);

  wrapper.appendChild(contentDiv);

  // Bind editar
  (meta.querySelector('[data-action="edit"]') as HTMLElement).addEventListener('click', () => {
    startNoteEdit(textEl, note, chainId);
  });

  return wrapper;
}

function startNoteEdit(textEl: HTMLElement, note: NoteDTO, chainId: string): void {
  const original = note.content;
  textEl.contentEditable = 'true';
  textEl.focus();
  // Posiciona cursor no final
  const range = document.createRange();
  range.selectNodeContents(textEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);

  const save = async () => {
    textEl.contentEditable = 'false';
    const newContent = textEl.textContent?.trim() ?? '';
    if (newContent && newContent !== original) {
      await AppController.updateNoteContent(chainId, note.id, newContent);
    } else if (!newContent) {
      textEl.textContent = original; // reverte se ficou vazio
    }
  };

  textEl.addEventListener('blur', save, { once: true });
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      textEl.textContent = original;
      textEl.contentEditable = 'false';
      textEl.removeEventListener('blur', save);
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textEl.blur();
    }
  });
}

function renderTagChip(tag: TagDTO, onRemove: () => void): HTMLElement {
  const chip = el('span', 'chip chip--selected');
  chip.setAttribute('aria-label', `Tag: ${tag.name}`);

  const label = document.createElement('span');
  label.textContent = tag.name;
  chip.appendChild(label);

  const removeBtn = el('button', 'chip__remove');
  removeBtn.setAttribute('aria-label', `Remover tag ${tag.name}`);
  removeBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>';
  removeBtn.addEventListener('click', (e) => { e.stopPropagation(); onRemove(); });
  chip.appendChild(removeBtn);

  return chip;
}

function renderComposer(chainId: string): HTMLElement {
  const composer = el('div', 'composer');
  composer.setAttribute('aria-label', 'Compositor de notas');

  const draft = DraftStore.load();

  // Mode selector
  const modeSelector = el('div', 'composer__mode-selector');
  modeSelector.setAttribute('role', 'group');
  modeSelector.setAttribute('aria-label', 'Modo de criação');

  const tailBtn = el('button', 'chip chip--selected');
  tailBtn.dataset['mode'] = 'tail';
  tailBtn.setAttribute('aria-pressed', 'true');
  tailBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px" aria-hidden="true">add</span> Continuar cadeia';

  const headerBtn = el('button', 'chip');
  headerBtn.dataset['mode'] = 'header';
  headerBtn.setAttribute('aria-pressed', 'false');
  headerBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px" aria-hidden="true">fiber_new</span> Nova cadeia';

  let composerMode: 'tail' | 'header' = draft?.mode ?? 'tail';

  const updateMode = (mode: 'tail' | 'header') => {
    composerMode = mode;
    tailBtn.classList.toggle('chip--selected', mode === 'tail');
    tailBtn.setAttribute('aria-pressed', mode === 'tail' ? 'true' : 'false');
    headerBtn.classList.toggle('chip--selected', mode === 'header');
    headerBtn.setAttribute('aria-pressed', mode === 'header' ? 'true' : 'false');
    placeholder.setAttribute('placeholder', mode === 'tail'
      ? 'Continuar esta cadeia…'
      : 'Iniciar uma nova cadeia…');
  };

  tailBtn.addEventListener('click', () => updateMode('tail'));
  headerBtn.addEventListener('click', () => updateMode('header'));

  modeSelector.appendChild(tailBtn);
  modeSelector.appendChild(headerBtn);
  composer.appendChild(modeSelector);

  // Textarea
  const placeholder = el('textarea', 'composer__textarea');
  placeholder.setAttribute('id', 'composer-input');
  placeholder.setAttribute('aria-label', 'Conteúdo da nota');
  placeholder.setAttribute('aria-multiline', 'true');
  placeholder.setAttribute('placeholder', 'Continuar esta cadeia…');
  placeholder.setAttribute('rows', '3');
  placeholder.setAttribute('autocomplete', 'off');
  placeholder.setAttribute('spellcheck', 'true');
  if (draft?.mode === composerMode && draft?.chainId === chainId) {
    placeholder.value = draft.content;
  }
  composer.appendChild(placeholder);

  // Footer
  const footer = el('div', 'composer__footer');

  const draftIndicator = el('span', 'composer__draft-indicator');
  draftIndicator.setAttribute('aria-live', 'polite');
  draftIndicator.style.display = 'none';
  footer.appendChild(draftIndicator);

  footer.appendChild(el('span', '')); // spacer

  const actions = el('div', 'composer__actions');

  const cancelBtn = el('button', 'btn btn-text');
  cancelBtn.setAttribute('aria-label', 'Cancelar e limpar compositor');
  cancelBtn.textContent = 'Limpar';
  cancelBtn.addEventListener('click', () => {
    placeholder.value = '';
    DraftStore.clear();
    draftIndicator.style.display = 'none';
  });

  const saveBtn = el('button', 'btn btn-filled');
  saveBtn.setAttribute('aria-label', 'Salvar nota (Ctrl+Enter)');
  saveBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">send</span> Salvar';

  const handleSave = async () => {
    const content = placeholder.value.trim();
    if (!content) {
      placeholder.focus();
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando…';
    try {
      if (composerMode === 'tail') {
        await AppController.appendNote(chainId, content);
      } else {
        await AppController.createChain(content);
      }
      placeholder.value = '';
      DraftStore.clear();
      draftIndicator.style.display = 'none';
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">send</span> Salvar';
    }
  };

  saveBtn.addEventListener('click', handleSave);
  placeholder.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  });

  // Preservar rascunho
  placeholder.addEventListener('input', debounce(() => {
    if (placeholder.value.trim()) {
      DraftStore.save({
        content: placeholder.value,
        mode: composerMode,
        chainId,
        savedAt: new Date().toISOString(),
      });
      draftIndicator.style.display = 'flex';
      draftIndicator.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px">save</span> Rascunho salvo';
    }
  }, 500) as unknown as EventListener);

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  footer.appendChild(actions);
  composer.appendChild(footer);

  // Keyboard shortcut hint
  const hint = el('p', '');
  hint.style.cssText = `font-size:11px;color:var(--md-sys-color-on-surface-variant);margin-top:4px;`;
  hint.textContent = 'Ctrl+Enter para salvar · N para nova cadeia';
  composer.appendChild(hint);

  return composer;
}

function renderEmptyDetail(
  icon = 'notes',
  title = 'Selecione uma cadeia',
  body = 'Escolha uma cadeia na lista ou crie uma nova para começar.'
): HTMLElement {
  const empty = el('div', 'empty-state');
  empty.style.cssText = 'flex:1;';
  empty.setAttribute('aria-label', title);
  empty.innerHTML = `
    <div class="empty-state__icon" aria-hidden="true">
      <span class="material-symbols-rounded">${escapeHtml(icon)}</span>
    </div>
    <p class="empty-state__title">${escapeHtml(title)}</p>
    <p class="empty-state__body">${escapeHtml(body)}</p>
  `;
  return empty;
}

function renderEmptyChains(view: string): HTMLElement {
  const labels: Record<string, { icon: string; title: string; body: string }> = {
    chains: { icon: 'account_tree', title: 'Nenhuma cadeia ainda', body: 'Crie sua primeira cadeia clicando no botão + acima.' },
    favorites: { icon: 'star', title: 'Sem favoritos', body: 'Marque cadeias como favoritas para encontrá-las aqui.' },
    archived: { icon: 'archive', title: 'Arquivo vazio', body: 'Cadeias arquivadas aparecerão aqui.' },
    trash: { icon: 'delete', title: 'Lixeira vazia', body: 'Cadeias excluídas aparecerão aqui.' },
  };
  const info = labels[view] ?? labels['chains']!;
  const empty = el('div', 'empty-state');
  empty.setAttribute('aria-label', info.title);
  empty.innerHTML = `
    <div class="empty-state__icon" aria-hidden="true">
      <span class="material-symbols-rounded">${escapeHtml(info.icon)}</span>
    </div>
    <p class="empty-state__title">${escapeHtml(info.title)}</p>
    <p class="empty-state__body">${escapeHtml(info.body)}</p>
  `;
  return empty;
}

function renderLoadingState(): HTMLElement {
  const loader = el('div', '');
  loader.style.cssText = 'padding:24px;';
  loader.innerHTML = `
    <div class="linear-progress" role="progressbar" aria-label="Carregando…" aria-valuemin="0" aria-valuemax="100">
      <div class="linear-progress__track"></div>
    </div>
  `;
  return loader;
}

// ── Search Layout ──────────────────────────────────────────────────────────

function renderSearchLayout(state: AppState): HTMLElement {
  const layout = el('div', '');
  layout.style.cssText = 'display:flex;flex-direction:column;flex:1;overflow:hidden;';
  layout.setAttribute('id', 'search-layout');

  const searchHeader = el('div', '');
  searchHeader.style.cssText = 'padding:16px 24px;border-bottom:1px solid var(--md-sys-color-outline-variant);flex-shrink:0;';

  const searchBar = el('div', 'search-bar');
  searchBar.innerHTML = `
    <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
    <input type="search" class="search-bar__input" id="search-input-main"
      placeholder="Pesquisar notas, títulos, tags…" aria-label="Campo de pesquisa"
      autocomplete="off" value="${escapeHtml(state.searchQuery)}" />
    <button class="btn-icon search-bar__clear" id="search-clear" aria-label="Limpar pesquisa" 
      style="${state.searchQuery ? '' : 'display:none'}">
      <span class="material-symbols-rounded" aria-hidden="true">close</span>
    </button>
  `;
  searchHeader.appendChild(searchBar);
  layout.appendChild(searchHeader);

  const results = el('div', 'search-results');
  results.setAttribute('id', 'search-results-list');
  results.setAttribute('role', 'list');
  results.setAttribute('aria-live', 'polite');
  results.setAttribute('aria-label', 'Resultados da pesquisa');
  layout.appendChild(results);

  // Bind search input
  const input = searchBar.querySelector<HTMLInputElement>('#search-input-main')!;
  const debouncedSearch = debounce(() => {
    if (input.value.trim()) AppController.search(input.value);
  }, 350);
  input.addEventListener('input', debouncedSearch as EventListener);
  input.focus();

  const clearBtn = searchBar.querySelector('#search-clear');
  clearBtn?.addEventListener('click', () => {
    input.value = '';
    appState.set({ searchQuery: '', searchResults: [] });
  });

  // Render results
  renderSearchResults(results, state);
  return layout;
}

function updateSearchLayout(content: HTMLElement, state: AppState): void {
  const results = qs('#search-results-list', content);
  if (results) renderSearchResults(results, state);
}

function renderSearchResults(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';

  if (state.isLoading) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (!state.searchQuery) {
    container.appendChild(renderEmptyDetail('search', 'Pesquise suas notas', 'Digite acima para buscar em conteúdo, títulos e tags.'));
    return;
  }

  if (state.searchResults.length === 0) {
    container.appendChild(renderEmptyDetail('search_off', 'Nenhum resultado', `Não encontramos nada para "${state.searchQuery}".`));
    return;
  }

  state.searchResults.forEach((result) => {
    const item = el('div', 'search-result card card--interactive');
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Resultado em ${result.chainTitle}`);

    const highlighted = highlightMatch(result.snippet, state.searchQuery);

    item.innerHTML = `
      <p class="search-result__chain">${escapeHtml(result.chainTitle)}</p>
      <p class="search-result__snippet">${highlighted}</p>
      <p class="search-result__meta">
        <time datetime="${result.noteCreatedAt}">${formatDate(result.noteCreatedAt)}</time>
        · ${result.noteRole === 'header' ? 'Header' : 'Tail'}
      </p>
    `;

    const open = () => AppController.navigateTo('chain-detail', result.chainId);
    item.addEventListener('click', open);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });

    container.appendChild(item);
  });
}

// ── Timeline Layout ────────────────────────────────────────────────────────

function renderTimelineLayout(state: AppState): HTMLElement {
  const layout = el('div', 'timeline-panel');
  layout.setAttribute('id', 'timeline-layout');

  const header = el('div', 'timeline-panel__header');

  const info = el('div', 'timeline-panel__info');
  info.innerHTML = `
    <span class="material-symbols-rounded" aria-hidden="true">info</span>
    <span>Visualização de leitura — não altera as cadeias originais</span>
  `;
  header.appendChild(info);

  // Seletor de cadeias
  const selectorSection = el('div', 'chain-selector');
  selectorSection.innerHTML = `<p style="font-size:14px;font-weight:500;color:var(--md-sys-color-on-surface)">Selecionar cadeias:</p>`;

  const chainList = el('div', 'chain-selector__list');
  chainList.setAttribute('aria-label', 'Cadeias disponíveis para timeline');

  // Load all chains for selection
  AppController.loadChains().then(() => {
    const chains = appState.get().chainSummaries;
    chains.forEach((chain) => {
      const item = renderChainSelectorItem(chain, state.timelineSelectedChainIds.includes(chain.id));
      chainList.appendChild(item);
    });
  });

  selectorSection.appendChild(chainList);

  const viewBtn = el('button', 'btn btn-filled');
  viewBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">timeline</span> Ver cronologia';
  viewBtn.addEventListener('click', () => {
    const selected = appState.get().timelineSelectedChainIds;
    if (selected.length < 2) {
      snackbar.show({ message: 'Selecione pelo menos 2 cadeias.' });
      return;
    }
    AppController.loadTimeline(selected);
  });
  selectorSection.appendChild(viewBtn);

  header.appendChild(selectorSection);
  layout.appendChild(header);

  const timelineList = el('div', 'timeline-panel__list');
  timelineList.setAttribute('id', 'timeline-list');
  timelineList.setAttribute('aria-live', 'polite');
  layout.appendChild(timelineList);

  renderTimelineEntries(timelineList, state);
  return layout;
}

function renderChainSelectorItem(chain: ChainSummaryDTO, isSelected: boolean): HTMLElement {
  const item = el('div', `chain-selector-item${isSelected ? ' chain-selector-item--selected' : ''}`);
  item.setAttribute('tabindex', '0');
  item.setAttribute('role', 'checkbox');
  item.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  item.setAttribute('aria-label', chain.displayTitle);
  item.dataset['chainId'] = chain.id;

  item.innerHTML = `
    <div class="chain-selector-item__check">
      ${isSelected ? '<span class="material-symbols-rounded" aria-hidden="true">check</span>' : ''}
    </div>
    <span class="chain-selector-item__title">${escapeHtml(chain.displayTitle)}</span>
    <span style="font-size:12px;color:var(--md-sys-color-on-surface-variant)">${chain.noteCount} notas</span>
  `;

  const toggle = () => {
    const current = appState.get().timelineSelectedChainIds;
    const newSelected = current.includes(chain.id)
      ? current.filter((id) => id !== chain.id)
      : [...current, chain.id];
    appState.set({ timelineSelectedChainIds: newSelected });
    item.classList.toggle('chain-selector-item--selected', newSelected.includes(chain.id));
    item.setAttribute('aria-checked', newSelected.includes(chain.id) ? 'true' : 'false');
    const check = item.querySelector('.chain-selector-item__check')!;
    check.innerHTML = newSelected.includes(chain.id)
      ? '<span class="material-symbols-rounded" aria-hidden="true">check</span>'
      : '';
  };

  item.addEventListener('click', toggle);
  item.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });

  return item;
}

function updateTimelineLayout(content: HTMLElement, state: AppState): void {
  const list = qs('#timeline-list', content);
  if (list) renderTimelineEntries(list, state);
}

function renderTimelineEntries(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';

  if (state.isLoading) {
    container.appendChild(renderLoadingState());
    return;
  }

  if (!state.timeline || state.timeline.entries.length === 0) {
    container.appendChild(renderEmptyDetail('timeline', 'Nenhuma entrada', 'Selecione cadeias acima e clique em "Ver cronologia".'));
    return;
  }

  let lastDate = '';
  state.timeline.entries.forEach((entry) => {
    const dateStr = new Date(entry.note.createdAt).toLocaleDateString('pt-BR');
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      const dateSep = el('div', '');
      dateSep.style.cssText = `
        font-size:12px;font-weight:500;color:var(--md-sys-color-on-surface-variant);
        padding:12px 0 4px;text-transform:uppercase;letter-spacing:0.08em;
      `;
      dateSep.textContent = new Date(entry.note.createdAt).toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      container.appendChild(dateSep);
    }

    const row = el('div', 'timeline-entry');
    row.setAttribute('role', 'article');

    const timeEl = el('time', 'timeline-entry__time');
    timeEl.setAttribute('datetime', entry.note.createdAt);
    timeEl.setAttribute('title', formatDateFull(entry.note.createdAt));
    timeEl.textContent = formatTime(entry.note.createdAt);

    const body = el('div', 'timeline-entry__body');
    const textEl = el('p', 'timeline-entry__text');
    textEl.textContent = entry.note.content;

    const chainLink = el('button', 'timeline-entry__chain');
    chainLink.setAttribute('aria-label', `Abrir cadeia: ${entry.chainTitle}`);
    chainLink.innerHTML = `
      <span class="material-symbols-rounded" aria-hidden="true" style="font-size:12px">open_in_new</span>
      ${escapeHtml(entry.chainTitle)}
    `;
    chainLink.addEventListener('click', () => AppController.navigateTo('chain-detail', entry.chainId));

    body.appendChild(textEl);
    body.appendChild(chainLink);
    row.appendChild(timeEl);
    row.appendChild(body);
    container.appendChild(row);
  });
}

// ── Tags Layout ────────────────────────────────────────────────────────────

function renderTagsLayout(state: AppState): HTMLElement {
  const layout = el('div', '');
  layout.style.cssText = 'display:flex;flex-direction:column;flex:1;overflow-y:auto;padding:24px;gap:16px;';
  layout.setAttribute('id', 'tags-layout');
  renderTagsContent(layout, state);
  return layout;
}

function updateTagsLayout(content: HTMLElement, state: AppState): void {
  const layout = qs('#tags-layout', content);
  if (layout) {
    layout.innerHTML = '';
    renderTagsContent(layout, state);
  }
}

function renderTagsContent(container: HTMLElement, state: AppState): void {
  if (state.allTags.length === 0) {
    container.appendChild(renderEmptyDetail('label_off', 'Nenhuma tag ainda', 'Tags são criadas ao associá-las a cadeias no editor.'));
    return;
  }

  const grid = el('div', '');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;';

  state.allTags.forEach((tag) => {
    const card = el('div', 'card card--outlined');
    card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 16px;min-width:180px;';

    card.innerHTML = `
      <span class="material-symbols-rounded" aria-hidden="true" style="color:var(--md-sys-color-secondary)">label</span>
      <div style="flex:1;min-width:0;">
        <p style="font-weight:500;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(tag.name)}</p>
        <p style="font-size:12px;color:var(--md-sys-color-on-surface-variant)">${tag.chainCount} cadeia${tag.chainCount !== 1 ? 's' : ''}</p>
      </div>
    `;

    const actionsDiv = el('div', '');
    actionsDiv.style.cssText = 'display:flex;gap:4px;';

    const editBtn = el('button', 'btn-icon');
    editBtn.setAttribute('aria-label', `Renomear tag ${tag.name}`);
    editBtn.setAttribute('title', `Renomear`);
    editBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">edit</span>';
    editBtn.addEventListener('click', async () => {
      const newName = await showInputDialog({
        title: 'Renomear tag',
        label: 'Novo nome',
        initialValue: tag.name,
      });
      if (newName) AppController.renameTag(tag.id, newName);
    });

    const deleteBtn = el('button', 'btn-icon');
    deleteBtn.setAttribute('aria-label', `Excluir tag ${tag.name}`);
    deleteBtn.setAttribute('title', `Excluir`);
    deleteBtn.style.color = 'var(--md-sys-color-error)';
    deleteBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">delete</span>';
    deleteBtn.addEventListener('click', () => AppController.deleteTagById(tag.id));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    card.appendChild(actionsDiv);

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ── Chain context menu ─────────────────────────────────────────────────────

function showChainMenu(e: MouseEvent, chainId: string): void {
  const existing = qs('#chain-menu');
  existing?.remove();

  const menu = el('div', '');
  menu.id = 'chain-menu';
  menu.style.cssText = `
    position:fixed;
    background:var(--md-sys-color-surface-container-high);
    border-radius:var(--md-sys-shape-corner-medium);
    box-shadow:var(--md-sys-elevation-2);
    padding:8px 0;
    min-width:180px;
    z-index:90;
    animation:dialog-in 150ms ease;
  `;

  const btn = e.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const state = appState.get();
  const chain = state.currentChain;

  const items: Array<{ icon: string; label: string; action: () => void; danger?: boolean }> = [
    {
      icon: chain?.isFavorite ? 'star_off' : 'star',
      label: chain?.isFavorite ? 'Remover favorito' : 'Adicionar favorito',
      action: () => AppController.toggleFavorite(chainId),
    },
    {
      icon: 'archive',
      label: 'Arquivar',
      action: () => AppController.archiveChain(chainId),
    },
    {
      icon: 'delete',
      label: 'Mover para lixeira',
      action: () => AppController.deleteChain(chainId),
      danger: true,
    },
  ];

  items.forEach(({ icon, label, action, danger }) => {
    const item = el('button', '');
    item.style.cssText = `
      display:flex;align-items:center;gap:12px;padding:12px 16px;width:100%;
      background:none;border:none;cursor:pointer;text-align:left;
      font-size:14px;color:${danger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface)'};
      font-family:inherit;
    `;
    item.innerHTML = `<span class="material-symbols-rounded" style="font-size:20px" aria-hidden="true">${escapeHtml(icon)}</span>${escapeHtml(label)}`;
    item.addEventListener('click', () => { menu.remove(); action(); });
    item.addEventListener('mouseenter', () => { item.style.backgroundColor = 'var(--md-sys-color-surface-container-highest)'; });
    item.addEventListener('mouseleave', () => { item.style.backgroundColor = ''; });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 0);
}

// ── Composer Modal (para nova cadeia) ──────────────────────────────────────

function showComposerModal(): void {
  const backdrop = el('div', 'dialog-backdrop');
  backdrop.setAttribute('role', 'presentation');

  const dialog = el('div', 'dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'modal-title');
  dialog.style.maxWidth = '600px';

  dialog.innerHTML = `
    <h2 id="modal-title" class="dialog__title" style="text-align:left">Nova cadeia</h2>
    <div class="text-field text-field--outlined" style="margin-bottom:8px">
      <div class="text-field__container">
        <input type="text" class="text-field__input" id="modal-title-input"
          placeholder=" " autocomplete="off" aria-label="Título opcional" />
        <label class="text-field__label" for="modal-title-input">Título (opcional)</label>
      </div>
    </div>
    <div class="text-field text-field--textarea text-field--outlined">
      <div class="text-field__container">
        <textarea class="text-field__input" id="modal-content-input"
          placeholder=" " rows="5" aria-label="Conteúdo da nota" required></textarea>
        <label class="text-field__label" for="modal-content-input">Conteúdo *</label>
      </div>
    </div>
    <div id="modal-tags-row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;">
      <span style="font-size:12px;color:var(--md-sys-color-on-surface-variant)">Tags:</span>
    </div>
    <div class="dialog__actions">
      <button class="btn btn-text" id="modal-cancel">Cancelar</button>
      <button class="btn btn-filled" id="modal-save">
        <span class="material-symbols-rounded" aria-hidden="true">add</span> Criar cadeia
      </button>
    </div>
  `;

  const tags: string[] = [];
  const tagsRow = dialog.querySelector('#modal-tags-row')!;

  const addTagChip = (name: string) => {
    const chip = el('span', 'chip chip--selected');
    chip.style.fontSize = '12px';
    const label = document.createElement('span');
    label.textContent = name;
    const rm = el('button', 'chip__remove');
    rm.setAttribute('aria-label', `Remover tag ${name}`);
    rm.innerHTML = '<span class="material-symbols-rounded" style="font-size:12px">close</span>';
    rm.addEventListener('click', () => {
      const idx = tags.indexOf(name);
      if (idx > -1) tags.splice(idx, 1);
      chip.remove();
    });
    chip.appendChild(label);
    chip.appendChild(rm);
    tagsRow.appendChild(chip);
  };

  const addTagBtn = el('button', 'chip');
  addTagBtn.style.fontSize = '12px';
  addTagBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px">add</span> tag';
  addTagBtn.addEventListener('click', async () => {
    const name = await showInputDialog({ title: 'Adicionar tag', label: 'Nome da tag' });
    if (name && !tags.includes(name)) {
      tags.push(name);
      addTagChip(name);
    }
  });
  tagsRow.appendChild(addTagBtn);

  const close = () => backdrop.remove();

  dialog.querySelector('#modal-cancel')!.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  const titleInput = dialog.querySelector<HTMLInputElement>('#modal-title-input')!;
  const contentInput = dialog.querySelector<HTMLTextAreaElement>('#modal-content-input')!;

  dialog.querySelector('#modal-save')!.addEventListener('click', async () => {
    const content = contentInput.value.trim();
    if (!content) {
      contentInput.focus();
      return;
    }
    close();
    await AppController.createChain(content, titleInput.value.trim() || undefined, tags);
  });

  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => contentInput.focus());
}

// ── Search Panel (global) ──────────────────────────────────────────────────

function showSearchPanel(): void {
  appState.set({ view: 'search', searchQuery: '', searchResults: [] });
}
