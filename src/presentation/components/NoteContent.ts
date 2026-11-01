import { findLinks } from '@shared/utilities/index.js';

function isTouchLike(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none)').matches
  );
}

function createLinkIcon(href: string): HTMLAnchorElement {
  const icon = document.createElement('a');
  icon.className = 'chain-note__link-icon';
  icon.href = href;
  icon.target = '_blank';
  icon.rel = 'noopener noreferrer';
  icon.referrerPolicy = 'no-referrer';
  icon.tabIndex = -1;
  icon.setAttribute('aria-hidden', 'true');
  icon.title = 'Abrir em nova aba';
  return icon;
}

function createLink(value: string, href: string): HTMLSpanElement {
  const group = document.createElement('span');
  group.className = 'chain-note__link-group';

  const link = document.createElement('a');
  link.className = 'chain-note__link';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.referrerPolicy = 'no-referrer';
  link.textContent = value;
  link.title = 'Ctrl/Cmd+clique para abrir em nova aba';
  link.setAttribute('aria-description', 'Ctrl/Cmd+clique para abrir em nova aba');
  link.addEventListener('click', (event) => {
    const isKeyboard = event.detail === 0;
    const isMiddleClick = event.button === 1;
    const opensNewTab = event.ctrlKey || event.metaKey || isKeyboard || isMiddleClick || isTouchLike();
    if (!opensNewTab) event.preventDefault();
  });

  group.append(createLinkIcon(href), link);
  return group;
}

export function renderNoteContent(target: HTMLElement, content: string): void {
  target.replaceChildren();

  findLinks(content).forEach((segment) => {
    if (segment.type === 'text') {
      target.appendChild(document.createTextNode(segment.value));
      return;
    }
    target.appendChild(createLink(segment.value, segment.href));
  });
}
