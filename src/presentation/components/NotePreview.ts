import type { NoteDTO } from '@application/dto/index.js';
import { formatDateFull, formatTime } from '@shared/utilities/index.js';
import { el } from '../dom.js';
import { NOTE_CONTENT_TYPE_META } from '../app/noteContentTypes.js';
import { renderLinkedText } from './LinkedText.js';
import { renderMarkdownContent } from './MarkdownContent.js';
import { highlightTextInElement } from './SearchHighlight.js';

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
}

export interface NotePreviewOptions {
  query?: string;
  accent?: string;
  onClose?: () => void;
  closeLabel?: string;
  action?: NotePreviewAction;
}

export function renderNotePreview(
  host: HTMLElement,
  entry: NotePreviewEntry,
  options: NotePreviewOptions = {}
): void {
  host.hidden = false;
  host.replaceChildren();

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

  if (options.action) {
    const actions = el('div', 'timeline-preview__actions');
    const action = el('button', 'btn btn-tonal');
    action.type = 'button';
    action.setAttribute(
      'aria-label',
      options.action.ariaLabel ?? options.action.label
    );
    action.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${options.action.icon}</span> ${options.action.label}`;
    action.addEventListener('click', options.action.onClick);
    actions.appendChild(action);
    content.appendChild(actions);
  }

  host.append(header, meta, content);
}
