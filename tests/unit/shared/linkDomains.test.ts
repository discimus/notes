import { describe, expect, it } from 'vitest';
import { extractLinkDomains } from '@shared/utilities/index.js';

describe('extractLinkDomains', () => {
  it('extrai domínios de links http(s), removendo www, porta e caminho', () => {
    const domains = extractLinkDomains(
      'Veja https://www.Example.com:8080/path?q=1#x e http://github.com/user/repo.'
    );

    expect(domains).toEqual(['example.com', 'github.com']);
  });

  it('deduplica domínios e mantém subdomínios', () => {
    const domains = extractLinkDomains(
      'https://example.com/a https://example.com/b https://docs.github.com/c'
    );

    expect(domains).toEqual(['example.com', 'docs.github.com']);
  });

  it('ignora localhost, IP, hosts sem ponto e domínios longos', () => {
    const longDomain = `${'a'.repeat(30)}.${'b'.repeat(30)}`;
    const domains = extractLinkDomains(
      [
        'http://localhost:3000',
        'http://127.0.0.1/path',
        'http://intranet/path',
        `https://${longDomain}/path`,
      ].join(' ')
    );

    expect(domains).toEqual([]);
  });

  it('respeita o limite de domínios', () => {
    const domains = extractLinkDomains(
      'https://a.com https://b.com https://c.com',
      { maxDomains: 2 }
    );

    expect(domains).toEqual(['a.com', 'b.com']);
  });

  it('aceita www sem protocolo e normaliza maiúsculas', () => {
    expect(extractLinkDomains('www.GitHub.com/user')).toEqual(['github.com']);
  });
});
