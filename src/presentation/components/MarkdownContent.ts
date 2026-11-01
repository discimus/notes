import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
});

markdown.validateLink = (url) => /^(https?:\/\/|mailto:)/i.test(url);

const defaultLinkOpen = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]?.attrSet('target', '_blank');
  tokens[idx]?.attrSet('rel', 'noopener noreferrer');
  tokens[idx]?.attrSet('referrerpolicy', 'no-referrer');
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

markdown.renderer.rules.image = (tokens, idx, options, _env, self) => {
  const src = tokens[idx]?.attrGet('src') ?? '';
  if (!/^https?:\/\//i.test(src)) return '';
  tokens[idx]?.attrSet('alt', tokens[idx]?.content ?? '');
  tokens[idx]?.attrSet('loading', 'lazy');
  tokens[idx]?.attrSet('referrerpolicy', 'no-referrer');
  return self.renderToken(tokens, idx, options);
};

export function renderMarkdownContent(target: HTMLElement, content: string): void {
  target.innerHTML = markdown.render(content);
}
