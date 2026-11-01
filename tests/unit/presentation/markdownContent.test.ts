import { describe, expect, it } from 'vitest';
import { renderMarkdownContent } from '@presentation/components/MarkdownContent.js';

function render(content: string): HTMLElement {
  const target = document.createElement('div');
  renderMarkdownContent(target, content);
  return target;
}

describe('MarkdownContent', () => {
  it('renderiza elementos Markdown comuns', () => {
    const target = render(
      '# Título\n\nTexto **forte** e `código`.\n\n- item\n\n> citação'
    );

    expect(target.querySelector('h1')?.textContent).toBe('Título');
    expect(target.querySelector('strong')?.textContent).toBe('forte');
    expect(target.querySelector('code')?.textContent).toBe('código');
    expect(target.querySelector('li')?.textContent).toBe('item');
    expect(target.querySelector('blockquote')?.textContent).toContain('citação');
  });

  it('abre links externos com segurança', () => {
    const target = render('[link](https://example.com)');

    const link = target.querySelector('a');
    expect(link?.classList.contains('note-link')).toBe(true);
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('não renderiza HTML bruto nem protocolos perigosos', () => {
    const target = render(
      '<script>alert(1)</script>\n\n[perigoso](javascript:alert(1))'
    );

    expect(target.querySelector('script')).toBeNull();
    expect(target.textContent).toContain('<script>alert(1)</script>');
    expect(target.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('ignora imagens sem protocolo HTTP seguro', () => {
    const target = render('![imagem](data:image/png;base64,abc)');

    expect(target.querySelector('img')).toBeNull();
  });
});
