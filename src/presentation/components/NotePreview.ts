import type { NoteDTO } from '@application/dto/index.js';
import { formatDateFull, formatTime } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { NOTE_CONTENT_TYPE_META } from '../app/noteContentTypes.js';
import { renderLinkedText } from './LinkedText.js';
import { renderMarkdownContent } from './MarkdownContent.js';
import { highlightTextInElement } from './SearchHighlight.js';

const PREVIEW_COMPACT_SCROLL_MIN = 24;
const PREVIEW_COMPACT_DELTA_MIN = 4;
const PREVIEW_EXPAND_DELTA_MIN = 8;
const PREVIEW_COMPACT_DELAY_MS = 120;

interface PreviewScrollState {
  scroller: HTMLElement;
  lastScrollTop: number;
  upwardDistance: number;
  compact: boolean;
  frame: number | null;
  compactTimer: ReturnType<typeof setTimeout> | null;
  expandTimer: ReturnType<typeof setTimeout> | null;
  onScroll: () => void;
}

const previewScrollStates = new WeakMap<HTMLElement, PreviewScrollState>();

export interface NotePreviewEntry {
  chainId: string;
  chainTitle: string;
  note: NoteDTO;
}

export interface NotePreviewAction {
  label: string;
  icon: string;
  onClick: () => void;
  ariaLabel?: string;
  variant?: 'tonal' | 'fab';
}

export interface NotePreviewNavigation {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  busy?: boolean;
}

export interface NotePreviewOptions {
  query?: string;
  accent?: string;
  onClose?: () => void;
  closeLabel?: string;
  action?: NotePreviewAction;
  navigation?: NotePreviewNavigation;
}

export function renderNotePreview(
  host: HTMLElement,
  entry: NotePreviewEntry,
  options: NotePreviewOptions = {}
): void {
  const previousScroll =
    host.querySelector<HTMLElement>('.timeline-preview__scroll')?.scrollTop ??
    0;
  const previousNoteId = host.dataset['previewNoteId'] ?? null;
  const sameNote = previousNoteId === entry.note.id;
  const wasCompact = host.classList.contains(
    'timeline-preview--actions-compact'
  );

  disposePreviewScroll(host);
  host.hidden = false;
  host.replaceChildren();
  host.dataset['previewNoteId'] = entry.note.id;

  const accent =
    options.accent ?? 'var(--md-sys-color-outline-variant)';
  host.style.setProperty('--timeline-chain-accent', accent);

  const header = el('div', 'timeline-preview__header');
  const heading = el('div', 'timeline-preview__heading');
  const eyebrow = el('span', 'timeline-preview__eyebrow');
  eyebrow.textContent = 'Prévia da nota';
  const title = el('h2', 'timeline-preview__title');
  title.textContent = entry.chainTitle;
  heading.append(eyebrow, title);

  if (options.onClose) {
    const close = el('button', 'btn-icon timeline-preview__close');
    close.type = 'button';
    const closeLabel = options.closeLabel ?? 'Fechar prévia';
    close.setAttribute('aria-label', closeLabel);
    close.title = closeLabel;
    close.innerHTML =
      '<span class="material-symbols-rounded" aria-hidden="true">close</span>';
    close.addEventListener('click', options.onClose);
    header.append(heading, close);
  } else {
    header.append(heading);
  }

  const meta = el('div', 'timeline-preview__meta');
  const chain = el('span', 'timeline-preview__chain');
  const dot = el('span', 'timeline-chain-swatch');
  dot.setAttribute('aria-hidden', 'true');
  dot.style.backgroundColor = accent;
  const chainName = el('span');
  chainName.textContent = entry.chainTitle;
  chain.append(dot, chainName);

  const time = el('time', 'timeline-preview__time');
  time.dateTime = entry.note.createdAt;
  time.textContent = `${formatDateFull(entry.note.createdAt)} \u00b7 ${formatTime(
    entry.note.createdAt
  )}`;

  meta.append(chain, time);
  const type = entry.note.contentType ?? 'text';
  if (type !== 'text') {
    const badge = el('span', 'timeline-entry__type');
    badge.textContent = NOTE_CONTENT_TYPE_META[type].label;
    meta.appendChild(badge);
  }

  const content = el('div', 'timeline-preview__content');
  const isMarkdown = type === 'markdown';
  const isCode = type === 'code';
  const text = el(
    isMarkdown ? 'div' : 'p',
    `timeline-preview__text${isCode ? ' timeline-preview__text--code' : ''}${
      isMarkdown ? ' note-markdown' : ''
    }`
  );
  if (isMarkdown) renderMarkdownContent(text, entry.note.content);
  else renderLinkedText(text, entry.note.content);
  highlightTextInElement(text, options.query ?? '');
  content.appendChild(text);

  if (entry.note.tags && entry.note.tags.length > 0) {
    const tags = el('div', 'timeline-preview__tags');
    entry.note.tags.forEach((tag) => {
      const chip = el('span', 'chip chip--sm');
      chip.textContent = tag.name;
      tags.appendChild(chip);
    });
    content.appendChild(tags);
  }

  if (options.action && options.action.variant !== 'fab') {
    content.appendChild(renderInlineAction(options.action));
  }

  const fabAction =
    options.action?.variant === 'fab' ? options.action : null;
  const navigation = options.navigation
    ? renderNavigation(options.navigation)
    : null;
  const scroll = el('div', 'timeline-preview__scroll');
  scroll.append(header, meta, content);

  const footer = el('footer', 'timeline-preview__footer');
  const actionBar = el('div', 'timeline-preview__action-bar');
  actionBar.setAttribute('role', 'group');
  actionBar.setAttribute('aria-label', 'Ações da prévia');
  if (navigation) actionBar.appendChild(navigation);
  if (fabAction) actionBar.appendChild(renderFabAction(fabAction));
  if (actionBar.childElementCount > 0) footer.appendChild(actionBar);

  host.classList.toggle('timeline-preview--with-fab', Boolean(fabAction));
  host.append(scroll);
  if (footer.childElementCount > 0) host.appendChild(footer);

  if (footer.childElementCount > 0) {
    bindPreviewScroll(
      host,
      scroll,
      sameNote ? previousScroll : 0,
      sameNote && wasCompact
    );
  } else {
    host.classList.remove('timeline-preview--actions-compact');
  }
}

function renderInlineAction(action: NotePreviewAction): HTMLElement {
  const actions = el(
    'div',
    'timeline-preview__actions timeline-preview__actions--inline'
  );
  const button = el('button', 'btn btn-tonal');
  button.type = 'button';
  button.setAttribute('aria-label', action.ariaLabel ?? action.label);
  button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${action.icon}</span> ${action.label}`;
  button.addEventListener('click', action.onClick);
  actions.appendChild(button);
  return actions;
}

function renderFabAction(action: NotePreviewAction): HTMLElement {
  const actions = el(
    'div',
    'timeline-preview__actions timeline-preview__actions--fab'
  );
  const button = el('button', 'btn timeline-preview__fab');
  button.type = 'button';
  button.setAttribute('aria-label', action.ariaLabel ?? action.label);
  button.title = action.ariaLabel ?? action.label;

  const icon = el('span', 'material-symbols-rounded');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = action.icon;
  const label = el('span', 'timeline-preview__fab-label');
  label.textContent = action.label;

  button.append(icon, label);
  button.addEventListener('click', action.onClick);
  actions.appendChild(button);
  return actions;
}

function renderNavigation(navigation: NotePreviewNavigation): HTMLElement {
  const nav = el('nav', 'timeline-preview__note-nav');
  nav.setAttribute('aria-label', 'Navegação entre notas');
  if (navigation.busy) nav.setAttribute('aria-busy', 'true');

  const button = (
    direction: 'previous' | 'next',
    enabled: boolean,
    onClick: () => void | Promise<void>
  ): HTMLButtonElement => {
    const element = el('button', 'timeline-preview__note-nav-button');
    element.type = 'button';
    element.dataset['previewNav'] = direction;
    element.disabled = navigation.busy === true || !enabled;

    const icon = el('span', 'material-symbols-rounded');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent =
      direction === 'previous' ? 'arrow_upward' : 'arrow_downward';

    const ariaLabel =
      direction === 'previous' ? 'Nota anterior' : 'Próxima nota';
    element.setAttribute('aria-label', ariaLabel);
    element.title = ariaLabel;
    element.appendChild(icon);
    element.addEventListener('click', () => {
      void onClick();
    });
    return element;
  };

  nav.append(
    button('previous', navigation.hasPrevious, navigation.onPrevious),
    button('next', navigation.hasNext, navigation.onNext)
  );
  return nav;
}

function bindPreviewScroll(
  host: HTMLElement,
  scroller: HTMLElement,
  initialScrollTop: number,
  preserveCompact: boolean
): void {
  scroller.scrollTop = initialScrollTop;
  const state: PreviewScrollState = {
    scroller,
    lastScrollTop: initialScrollTop,
    upwardDistance: 0,
    compact:
      preserveCompact && initialScrollTop > PREVIEW_COMPACT_SCROLL_MIN,
    frame: null,
    compactTimer: null,
    expandTimer: null,
    onScroll: () => undefined,
  };

  const applyCompact = (value: boolean): void => {
    state.compact = value;
    host.classList.toggle('timeline-preview--actions-compact', value);
  };

  const clearTimers = (): void => {
    if (state.compactTimer !== null) {
      clearTimeout(state.compactTimer);
      state.compactTimer = null;
    }
    if (state.expandTimer !== null) {
      clearTimeout(state.expandTimer);
      state.expandTimer = null;
    }
  };

  state.onScroll = (): void => {
    if (state.frame !== null) return;
    let ranSynchronously = false;
    const frame = requestAnimationFrame(() => {
      ranSynchronously = true;
      state.frame = null;
      const current = scroller.scrollTop;
      const delta = current - state.lastScrollTop;
      state.lastScrollTop = current;

      if (current <= PREVIEW_COMPACT_SCROLL_MIN) {
        clearTimers();
        state.upwardDistance = 0;
        if (state.compact) applyCompact(false);
        return;
      }

      if (delta > PREVIEW_COMPACT_DELTA_MIN) {
        if (state.expandTimer !== null) {
          clearTimeout(state.expandTimer);
          state.expandTimer = null;
        }
        state.upwardDistance = 0;
        if (!state.compact && state.compactTimer === null) {
          state.compactTimer = setTimeout(() => {
            state.compactTimer = null;
            if (scroller.scrollTop > PREVIEW_COMPACT_SCROLL_MIN) {
              applyCompact(true);
            }
          }, PREVIEW_COMPACT_DELAY_MS);
        }
        return;
      }

      if (delta < 0 && state.compact) {
        if (state.compactTimer !== null) {
          clearTimeout(state.compactTimer);
          state.compactTimer = null;
        }
        state.upwardDistance += Math.abs(delta);
        if (
          state.upwardDistance >= PREVIEW_EXPAND_DELTA_MIN &&
          state.expandTimer === null
        ) {
          state.expandTimer = setTimeout(() => {
            state.expandTimer = null;
            applyCompact(false);
          }, PREVIEW_COMPACT_DELAY_MS);
        }
      } else if (delta > 0) {
        if (state.expandTimer !== null) {
          clearTimeout(state.expandTimer);
          state.expandTimer = null;
        }
        state.upwardDistance = 0;
      }
    });
    if (!ranSynchronously) state.frame = frame;
  };

  applyCompact(state.compact);
  scroller.addEventListener('scroll', state.onScroll, { passive: true });
  previewScrollStates.set(host, state);
}

function disposePreviewScroll(host: HTMLElement): void {
  const state = previewScrollStates.get(host);
  if (!state) return;
  if (state.frame !== null) cancelAnimationFrame(state.frame);
  if (state.compactTimer !== null) clearTimeout(state.compactTimer);
  if (state.expandTimer !== null) clearTimeout(state.expandTimer);
  state.scroller.removeEventListener('scroll', state.onScroll);
  previewScrollStates.delete(host);
}
