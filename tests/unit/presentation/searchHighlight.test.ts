import { describe, expect, it } from 'vitest';
import { highlightTextInElement } from '@presentation/components/SearchHighlight.js';

describe('Busca com realce', () => {
  it('realça ocorrências sem alterar o texto original', () => {
    const root = document.createElement('p');
    root.textContent = 'Revisão do código e revisao final';
    const original = root.textContent;

    highlightTextInElement(root, 'revisao');

    const marks = [...root.querySelectorAll('mark.timeline-search-highlight')];
    expect(marks.map((mark) => mark.textContent)).toEqual([
      'Revisão',
      'revisao',
    ]);
    expect(root.textContent).toBe(original);
  });

  it('preserva links e realça o texto dentro deles', () => {
    const root = document.createElement('p');
    root.innerHTML =
      'Veja <a class="note-link" href="https://example.com">example.com</a> agora';
    const link = root.querySelector('a');

    highlightTextInElement(root, 'example');

    expect(root.querySelector('a')).toBe(link);
    expect(link?.querySelector('mark')?.textContent).toBe('example');
  });
});
