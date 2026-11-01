const DIACRITICS = /[\u0300-\u036f]/g;
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'MARK']);

function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

function foldWithMap(text: string): {
  folded: string;
  starts: number[];
  ends: number[];
} {
  let folded = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;

  for (const original of text) {
    const piece = fold(original);
    for (const character of piece) {
      folded += character;
      starts.push(index);
      ends.push(index + original.length);
    }
    index += original.length;
  }

  return { folded, starts, ends };
}

function hasSkippedParent(node: Text): boolean {
  let element = node.parentElement;
  while (element) {
    if (SKIPPED_TAGS.has(element.tagName)) return true;
    element = element.parentElement;
  }
  return false;
}

function highlightTextNode(node: Text, normalizedQuery: string): void {
  const text = node.nodeValue ?? '';
  if (!text) return;

  const { folded, starts, ends } = foldWithMap(text);
  let searchFrom = 0;
  let matchIndex = folded.indexOf(normalizedQuery, searchFrom);
  if (matchIndex < 0) return;

  const fragment = document.createDocumentFragment();
  let lastOriginalIndex = 0;

  while (matchIndex >= 0) {
    const start = starts[matchIndex];
    const end = ends[matchIndex + normalizedQuery.length - 1];
    if (start === undefined || end === undefined) break;

    if (start > lastOriginalIndex) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastOriginalIndex, start))
      );
    }

    const mark = document.createElement('mark');
    mark.className = 'timeline-search-highlight';
    mark.textContent = text.slice(start, end);
    fragment.appendChild(mark);
    lastOriginalIndex = end;
    searchFrom = matchIndex + normalizedQuery.length;
    matchIndex = folded.indexOf(normalizedQuery, searchFrom);
  }

  fragment.appendChild(document.createTextNode(text.slice(lastOriginalIndex)));
  node.replaceWith(fragment);
}

export function highlightTextInElement(
  root: HTMLElement,
  query: string | undefined
): void {
  if (!query?.trim()) return;

  const normalizedQuery = fold(query.trim());
  if (!normalizedQuery) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!(node instanceof Text)) continue;
    if (!node.nodeValue || hasSkippedParent(node)) continue;
    if (fold(node.nodeValue).includes(normalizedQuery)) nodes.push(node);
  }

  nodes.forEach((node) => highlightTextNode(node, normalizedQuery));
}
