import { beforeEach, describe, expect, it } from 'vitest';
import { el, qs, qsa } from '@presentation/dom.js';

describe('dom helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('cria elemento com classe e conteúdo html', () => {
    const node = el('div', 'card', '<span>ok</span>');

    expect(node.tagName).toBe('DIV');
    expect(node.className).toBe('card');
    expect(node.innerHTML).toBe('<span>ok</span>');
  });

  it('encontra o primeiro elemento por seletor', () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';

    const found = qs('#b');

    expect(found?.id).toBe('b');
  });

  it('retorna todos os elementos por seletor', () => {
    document.body.innerHTML = '<span class="item"></span><span class="item"></span>';

    expect(qsa('.item')).toHaveLength(2);
  });
});
