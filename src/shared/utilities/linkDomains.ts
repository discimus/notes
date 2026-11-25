import { findLinks } from './linkify.js';

export const DEFAULT_MAX_LINK_DOMAINS = 5;
const MAX_DOMAIN_LENGTH = 50;
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function normalizeHostname(hostname: string): string | null {
  let value = hostname.trim().toLowerCase();
  if (!value) return null;

  if (value.endsWith('.')) value = value.slice(0, -1);
  if (value.startsWith('www.')) value = value.slice(4);

  if (!value || value.length > MAX_DOMAIN_LENGTH) return null;
  if (value === 'localhost') return null;
  if (value.includes(':') || value.includes('[') || value.includes(']')) return null;
  if (IPV4_PATTERN.test(value)) return null;
  if (!value.includes('.')) return null;

  return value;
}

/**
 * Extrai domínios únicos de links http(s) no texto.
 * Usa a mesma semântica de detecção do linkify da aplicação.
 */
export function extractLinkDomains(
  text: string,
  options: { maxDomains?: number } = {}
): string[] {
  const maxDomains = options.maxDomains ?? DEFAULT_MAX_LINK_DOMAINS;
  if (maxDomains <= 0) return [];

  const domains: string[] = [];
  const seen = new Set<string>();

  for (const segment of findLinks(text)) {
    if (segment.type !== 'link') continue;

    try {
      const url = new URL(segment.href);
      const domain = normalizeHostname(url.hostname);
      if (!domain || seen.has(domain)) continue;
      seen.add(domain);
      domains.push(domain);
      if (domains.length >= maxDomains) break;
    } catch {
      continue;
    }
  }

  return domains;
}
