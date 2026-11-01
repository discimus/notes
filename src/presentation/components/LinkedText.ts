import { findLinks } from '@shared/utilities/index.js';

function createLink(value: string, href: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'note-link';
  link.href = href;
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  link.setAttribute('referrerpolicy', 'no-referrer');
  link.textContent = value;
  return link;
}

export function renderLinkedText(target: HTMLElement, content: string): void {
  target.replaceChildren();

  findLinks(content).forEach((segment) => {
    if (segment.type === 'text') {
      target.appendChild(document.createTextNode(segment.value));
      return;
    }
    target.appendChild(createLink(segment.value, segment.href));
  });
}
