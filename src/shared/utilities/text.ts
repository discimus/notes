/** Normaliza texto para comparações: minúsculas, sem acentos, sem espaços duplos */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrai uma prévia truncada do conteúdo */
export function excerpt(content: string, maxLength = 120): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trimEnd() + '…';
}

/** Escapa HTML para renderização segura como texto */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/** Verifica se uma string é não-vazia após trim */
export function isNonEmpty(text: string): boolean {
  return text.trim().length > 0;
}

/** Destaca ocorrências de um termo em um texto (retorna HTML seguro) */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const normalized = normalizeText(query);
  const parts: string[] = [];
  let lastIndex = 0;
  const normalizedText = normalizeText(text);
  let idx = normalizedText.indexOf(normalized);
  while (idx !== -1) {
    parts.push(escapeHtml(text.slice(lastIndex, idx)));
    parts.push(`<mark>${escapeHtml(text.slice(idx, idx + normalized.length))}</mark>`);
    lastIndex = idx + normalized.length;
    idx = normalizedText.indexOf(normalized, lastIndex);
  }
  parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join('');
}

/** Debounce simples */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
