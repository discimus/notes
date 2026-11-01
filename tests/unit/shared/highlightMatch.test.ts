import { describe, expect, it } from 'vitest';
import { highlightMatch } from '@shared/utilities/index.js';

function render(text: string, query: string): HTMLElement {
  const root = document.createElement('p');
  root.innerHTML = highlightMatch(text, query);
  return root;
}

describe('highlightMatch', () => {
  it('mantém o realce alinhado quando o texto tem acentos', () => {
    const text = 'Revisão do código e revisao final';
    const root = render(text, 'revisao');

    expect(
      [...root.querySelectorAll('mark')].map((mark) => mark.textContent)
    ).toEqual(['Revisão', 'revisao']);
    expect(root.textContent).toBe(text);
  });

  it('mantém o realce alinhado com espaços repetidos', () => {
    const text = 'foo   bar';
    const root = render(text, 'foo bar');

    expect(root.querySelector('mark')?.textContent).toBe('foo   bar');
    expect(root.textContent).toBe(text);
  });

  it('realça a palavra original com acento ao buscar a forma sem acento', () => {
    const text = 'Um café pela manhã';
    const root = render(text, 'cafe');

    expect(root.querySelector('mark')?.textContent).toBe('café');
  });
});
