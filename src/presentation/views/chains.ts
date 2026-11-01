import { appState } from '../state/AppState.js';
import type { AppState } from '../state/AppState.js';
import { AppController } from '../pages/AppController.js';
import { DraftStore } from '../state/DraftStore.js';
import { showInputDialog } from '../components/Dialog.js';
import { formatDate, formatDateFull, escapeHtml, debounce, now } from '@shared/utilities/index.js';
import type { ChainSummaryDTO, NoteDTO, TagDTO } from '@application/dto/index.js';
import { el } from '../dom.js';
import { renderChainListItem } from '../components/ChainListItem.js';
import { renderEmptyDetail, renderLoadingState } from '../components/states.js';
import { filterChains } from '../filters.js';
import {
  isVerbatimContentType,
  NOTE_CONTENT_TYPE_META,
} from '../app/noteContentTypes.js';
import { showChainMenu, showComposerModal } from './menus.js';
import { renderNavToggle } from '../components/NavToggle.js';

export function renderChainsLayout(state: AppState): HTMLElement {
  const layout = el('div', 'chains-layout');

  const panel = el('div', 'chains-panel');
  panel.setAttribute('id', 'chains-panel');
  panel.setAttribute('aria-label', 'Lista de cadeias');

  const panelHeader = el('div', 'chains-panel__header');

  const searchBar = el('div', 'search-bar');
  searchBar.innerHTML = `
    <span class="search-bar__icon material-symbols-rounded" aria-hidden="true">search</span>
    <input type="search" class="search-bar__input" id="chains-search-input"
      placeholder="Filtrar cadeiasâ€¦" aria-label="Filtrar cadeias" autocomplete="off"
      value="${escapeHtml(state.chainFilterQuery)}" />
    <button class="btn-icon search-bar__clear" id="chains-filter-clear"
      aria-label="Limpar filtro" ${state.chainFilterQuery ? '' : 'hidden'}>
      <span class="material-symbols-rounded" aria-hidden="true">close</span>
    </button>
  `;
  panelHeader.appendChild(searchBar);

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

  const detail = el('div', 'detail-panel');
  detail.setAttribute('id', 'detail-panel');
  layout.appendChild(detail);

  const searchInput = searchBar.querySelector<HTMLInputElement>('#chains-search-input')!;
  const clearFilter = searchBar.querySelector<HTMLButtonElement>('#chains-filter-clear')!;

  const applyFilter = (value: string) => {
    appState.set({ chainFilterQuery: value });
    clearFilter.hidden = !value.trim();
  };

  searchInput.addEventListener('input', () => applyFilter(searchInput.value));
  clearFilter.addEventListener('click', () => {
    searchInput.value = '';
    applyFilter('');
    searchInput.focus();
  });

  renderChainsList(list, state);
  renderDetailPanel(detail, state);

  return layout;
}

export function updateChainsLayout(content: HTMLElement, state: AppState): void {
  const searchInput = content.querySelector<HTMLInputElement>('#chains-search-input');
  if (searchInput && searchInput.value !== state.chainFilterQuery) {
    searchInput.value = state.chainFilterQuery;
  }
  const clearFilter = content.querySelector<HTMLButtonElement>('#chains-filter-clear');
  if (clearFilter) clearFilter.hidden = !state.chainFilterQuery.trim();

  const list = content.querySelector('#chains-list');
  const detail = content.querySelector('#detail-panel');
  if (list) renderChainsList(list as HTMLElement, state);
  if (detail) renderDetailPanel(detail as HTMLElement, state);
}

function getViewLabel(view: string): string {
  const map: Record<string, string> = {
    chains: 'Cadeias',
    'chain-detail': 'Cadeias',
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

  const filtered = filterChains(state.chainSummaries, state.chainFilterQuery);
  if (filtered.length === 0) {
    container.appendChild(
      renderEmptyDetail(
        'search_off',
        'Nenhuma cadeia encontrada',
        `Nada corresponde a "${state.chainFilterQuery}".`
      )
    );
    return;
  }

  filtered.forEach((chain) => {
    const item = renderChainItem(chain, state.selectedChainId === chain.id, state.view);
    container.appendChild(item);
  });
}

function renderChainItem(
  chain: ChainSummaryDTO,
  isActive: boolean,
  view: string
): HTMLElement {
  return renderChainListItem(chain, isActive, () => {
    if (view === 'archived' || view === 'trash') {
      void AppController.openChain(chain.id);
    } else {
      void AppController.openChainInEditor(chain.id);
    }
  });
}

function renderDetailPanel(container: HTMLElement, state: AppState): void {
  container.innerHTML = '';

  if (state.view !== 'chain-detail') {
    const navRow = el('div', 'detail-panel__nav-row');
    navRow.appendChild(renderNavToggle());
    container.appendChild(navRow);
  }

  if (state.view === 'chain-detail' && state.currentChain) {
    const chain = state.currentChain;

    const header = el('div', 'detail-panel__header');
    const titleRow = el('div', 'detail-panel__title-row');
    titleRow.appendChild(renderNavToggle());

    const titleEl = el('h2', 'detail-panel__title');
    titleEl.setAttribute('contenteditable', 'true');
    titleEl.setAttribute('aria-label', 'TÃ­tulo da cadeia');
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

    const actions = el('div', 'detail-panel__actions');
    const moreBtn = el('button', 'btn-icon');
    moreBtn.setAttribute('aria-label', 'Mais opções');
    moreBtn.setAttribute('title', 'Mais opções');
    moreBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">more_vert</span>';
    moreBtn.addEventListener('click', (event) => showChainMenu(event, chain.id));
    actions.appendChild(moreBtn);

    titleRow.append(titleEl, actions);
    header.appendChild(titleRow);

    const tagsRow = el('div', 'detail-panel__tags');
    tagsRow.setAttribute('aria-label', 'Tags da cadeia');
    chain.tags.forEach((tag) => {
      const chip = renderTagChip(tag, () => AppController.removeTag(chain.id, tag.id));
      tagsRow.appendChild(chip);
    });
    const addTagBtn = el('button', 'chip');
    addTagBtn.setAttribute('aria-label', 'Adicionar tag');
    addTagBtn.innerHTML = '<span class="material-symbols-rounded icon-md" aria-hidden="true">add</span> Tag';
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

    container.appendChild(renderComposer(chain.id));

  } else if (state.view === 'chains') {
    container.appendChild(renderEmptyDetail());
  } else if (state.view === 'archived') {
    container.appendChild(renderEmptyDetail('archive', 'Arquivo', 'Selecione uma cadeia arquivada para visualizÃ¡-la.'));
  } else if (state.view === 'trash') {
    container.appendChild(renderEmptyDetail('delete', 'Lixeira', 'Selecione uma cadeia na lixeira para gerenciÃ¡-la.'));
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

  if (idx < total - 1) {
    const line = el('div', 'note-thread__line');
    line.setAttribute('aria-hidden', 'true');
    indicator.appendChild(line);
  }
  wrapper.appendChild(indicator);

  const contentDiv = el('div', 'note-thread__content');

  const type = note.contentType ?? 'text';
  const isCode = type === 'code';
  const verbatim = isVerbatimContentType(type);
  const textEl = el(
    'p',
    `note-thread__text note-thread__text--${note.role}${
      isCode ? ' note-thread__text--code' : ''
    }${verbatim ? ' note-thread__text--verbatim' : ''}`
  );
  textEl.textContent = note.content;
  contentDiv.appendChild(textEl);

  const meta = el('div', 'note-thread__meta');
  meta.innerHTML = `
    <time datetime="${note.createdAt}" title="${formatDateFull(note.createdAt)}">${formatDate(note.createdAt)}</time>
    ${note.updatedAt !== note.createdAt ? `<span aria-label="Editado">Â· editado ${formatDate(note.updatedAt)}</span>` : ''}
    <div class="note-thread__actions" role="group" aria-label="AÃ§Ãµes da nota">
      <button class="btn-icon" title="Editar nota" aria-label="Editar nota" data-action="edit">
        <span class="material-symbols-rounded" aria-hidden="true">edit</span>
      </button>
    </div>
  `;
  contentDiv.appendChild(meta);

  wrapper.appendChild(contentDiv);

  (meta.querySelector('[data-action="edit"]') as HTMLElement).addEventListener('click', () => {
    if (verbatim) startVerbatimNoteEdit(textEl, note, chainId, type);
    else startNoteEdit(textEl, note, chainId);
  });

  return wrapper;
}

function startVerbatimNoteEdit(
  textEl: HTMLElement,
  note: NoteDTO,
  chainId: string,
  contentType: NonNullable<NoteDTO['contentType']>
): void {
  const original = note.content;
  const meta = NOTE_CONTENT_TYPE_META[contentType];
  const editor = el('textarea', 'chain-note__code-editor') as HTMLTextAreaElement;
  editor.value = original;
  editor.rows = Math.min(24, Math.max(4, original.split(/\r?\n/).length + 1));
  editor.spellcheck = meta.spellcheck;
  editor.setAttribute('aria-label', `Editar ${meta.label} da nota`);

  let finished = false;
  const restore = (): void => {
    if (editor.parentElement) editor.replaceWith(textEl);
  };
  const save = async (): Promise<void> => {
    if (finished) return;
    finished = true;
    const content = editor.value;

    if (!content.trim()) {
      restore();
      return;
    }
    if (content !== original) {
      await AppController.updateNoteContent(chainId, note.id, content, contentType);
    }
    restore();
  };

  textEl.replaceWith(editor);
  editor.focus();
  editor.setSelectionRange(original.length, original.length);

  editor.addEventListener('blur', () => {
    void save();
  }, { once: true });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finished = true;
      restore();
      return;
    }
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void save();
    }
  });
}

function startNoteEdit(textEl: HTMLElement, note: NoteDTO, chainId: string): void {
  const original = note.content;
  textEl.contentEditable = 'true';
  textEl.focus();
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
      textEl.textContent = original;
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

  const modeSelector = el('div', 'composer__mode-selector');
  modeSelector.setAttribute('role', 'group');
  modeSelector.setAttribute('aria-label', 'Modo de criaÃ§Ã£o');

  const tailBtn = el('button', 'chip chip--selected');
  tailBtn.dataset['mode'] = 'tail';
  tailBtn.setAttribute('aria-pressed', 'true');
  tailBtn.innerHTML = '<span class="material-symbols-rounded icon-md" aria-hidden="true">add</span> Continuar cadeia';

  const headerBtn = el('button', 'chip');
  headerBtn.dataset['mode'] = 'header';
  headerBtn.setAttribute('aria-pressed', 'false');
  headerBtn.innerHTML = '<span class="material-symbols-rounded icon-md" aria-hidden="true">fiber_new</span> Nova cadeia';

  let composerMode: 'tail' | 'header' = 'tail';

  const placeholder = el('textarea', 'composer__textarea');

  const updateMode = (mode: 'tail' | 'header') => {
    composerMode = mode;
    tailBtn.classList.toggle('chip--selected', mode === 'tail');
    tailBtn.setAttribute('aria-pressed', mode === 'tail' ? 'true' : 'false');
    headerBtn.classList.toggle('chip--selected', mode === 'header');
    headerBtn.setAttribute('aria-pressed', mode === 'header' ? 'true' : 'false');
    placeholder.setAttribute('placeholder', mode === 'tail'
      ? 'Continuar esta cadeiaâ€¦'
      : 'Iniciar uma nova cadeiaâ€¦');
  };

  tailBtn.addEventListener('click', () => updateMode('tail'));
  headerBtn.addEventListener('click', showComposerModal);

  modeSelector.appendChild(tailBtn);
  modeSelector.appendChild(headerBtn);
  composer.appendChild(modeSelector);

  placeholder.setAttribute('id', 'composer-input');
  placeholder.setAttribute('aria-label', 'ConteÃºdo da nota');
  placeholder.setAttribute('aria-multiline', 'true');
  placeholder.setAttribute('placeholder', 'Continuar esta cadeiaâ€¦');
  placeholder.setAttribute('rows', '3');
  placeholder.setAttribute('autocomplete', 'off');
  placeholder.setAttribute('spellcheck', 'true');
  if (draft?.mode === composerMode && draft?.chainId === chainId) {
    placeholder.value = draft.content;
  }
  composer.appendChild(placeholder);

  const footer = el('div', 'composer__footer');

  const draftIndicator = el('span', 'composer__draft-indicator');
  draftIndicator.setAttribute('aria-live', 'polite');
  draftIndicator.hidden = true;
  footer.appendChild(draftIndicator);

  footer.appendChild(el('span', ''));

  const actions = el('div', 'composer__actions');

  const cancelBtn = el('button', 'btn btn-text');
  cancelBtn.setAttribute('aria-label', 'Cancelar e limpar compositor');
  cancelBtn.textContent = 'Limpar';
  cancelBtn.addEventListener('click', () => {
    placeholder.value = '';
    DraftStore.clear();
    draftIndicator.hidden = true;
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
    saveBtn.textContent = 'Salvandoâ€¦';
    try {
      await AppController.appendNote(chainId, content);
      placeholder.value = '';
      DraftStore.clear();
      draftIndicator.hidden = true;
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

  placeholder.addEventListener('input', debounce(() => {
    if (placeholder.value.trim()) {
      DraftStore.save({
        content: placeholder.value,
        mode: composerMode,
        chainId,
        savedAt: now(),
      });
      draftIndicator.hidden = false;
      draftIndicator.innerHTML = '<span class="material-symbols-rounded icon-sm">save</span> Rascunho salvo';
    }
  }, 500) as unknown as EventListener);

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  footer.appendChild(actions);
  composer.appendChild(footer);

  const hint = el('p', 'composer__hint');
  hint.textContent = 'Ctrl+Enter para salvar Â· N para nova cadeia';
  composer.appendChild(hint);

  return composer;
}

function renderEmptyChains(view: string): HTMLElement {
  const labels: Record<string, { icon: string; title: string; body: string }> = {
    chains: { icon: 'account_tree', title: 'Nenhuma cadeia ainda', body: 'Crie sua primeira cadeia clicando no botÃ£o + acima.' },
    archived: { icon: 'archive', title: 'Arquivo vazio', body: 'Cadeias arquivadas aparecerÃ£o aqui.' },
    trash: { icon: 'delete', title: 'Lixeira vazia', body: 'Cadeias excluÃ­das aparecerÃ£o aqui.' },
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
