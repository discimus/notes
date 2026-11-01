import { describe, expect, it } from 'vitest';
import { findLinks } from '@shared/utilities/index.js';

function links(text: string) {
  return findLinks(text).filter((segment) => segment.type === 'link');
}

describe('findLinks', () => {
  it('detecta http(s) e www preservando o texto ao redor', () => {
    expect(
      findLinks('Veja https://example.com/docs. Agora.')
    ).toEqual([
      { type: 'text', value: 'Veja ' },
      {
        type: 'link',
        value: 'https://example.com/docs',
        href: 'https://example.com/docs',
      },
      { type: 'text', value: '. Agora.' },
    ]);
  });

  it('normaliza www para https e remove pontuação final', () => {
    expect(links('www.openai.com.')).toEqual([
      {
        type: 'link',
        value: 'www.openai.com',
        href: 'https://www.openai.com/',
      },
    ]);
  });

  it('detecta múltiplos links no mesmo texto', () => {
    expect(links('a https://one.dev b www.two.dev/c c')).toHaveLength(2);
  });

  it('mantém parênteses balanceados e remove fechamentos sobrando', () => {
    expect(links('https://example.com/(foo)')).toEqual([
      {
        type: 'link',
        value: 'https://example.com/(foo)',
        href: 'https://example.com/(foo)',
      },
    ]);

    expect(links('https://example.com/foo).')).toEqual([
      {
        type: 'link',
        value: 'https://example.com/foo',
        href: 'https://example.com/foo',
      },
    ]);
  });

  it('não linkifica protocolos inseguros, domínios soltos ou e-mails', () => {
    const text = 'javascript:alert(1) ftp://example.com example.com a@b.com';
    expect(findLinks(text)).toEqual([{ type: 'text', value: text }]);
  });

  it('não quebra com URLs incompletas', () => {
    expect(findLinks('https:// e www.')).toEqual([
      { type: 'text', value: 'https:// e www.' },
    ]);
  });

  it('retorna lista vazia para texto vazio', () => {
    expect(findLinks('')).toEqual([]);
  });
});
