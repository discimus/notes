export function qs<T extends Element = HTMLElement>(
  selector: string,
  parent: Element | Document = document
): T | null {
  return parent.querySelector<T>(selector);
}

export function qsa<T extends Element = HTMLElement>(
  selector: string,
  parent: Element | Document = document
): T[] {
  return [...parent.querySelectorAll<T>(selector)];
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (html) element.innerHTML = html;
  return element;
}
