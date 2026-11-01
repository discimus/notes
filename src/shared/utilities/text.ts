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

interface NormalizedTextMap {
  text: string;
  starts: number[];
  ends: number[];
}

export interface TextMatchRange {
  start: number;
  end: number;
}

function foldCharacter(character: string): string {
  return character
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeWithMap(input: string): NormalizedTextMap {
  let text = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let whitespaceIndex: number | undefined;
  let index = 0;

  while (index < input.length) {
    const codePoint = input.codePointAt(index);
    if (codePoint === undefined) break;
    const original = String.fromCodePoint(codePoint);
    const isWhitespace = /\s/.test(original);

    if (isWhitespace) {
      if (whitespaceIndex === undefined) {
        whitespaceIndex = starts.length;
        text += ' ';
        starts.push(index);
        ends.push(index + original.length);
      } else {
        ends[whitespaceIndex] = index + original.length;
      }
    } else {
      whitespaceIndex = undefined;
      for (const character of foldCharacter(original)) {
        text += character;
        starts.push(index);
        ends.push(index + original.length);
      }
    }

    index += original.length;
  }

  let from = 0;
  let to = text.length;
  while (from < to && text[from] === ' ') from += 1;
  while (to > from && text[to - 1] === ' ') to -= 1;

  return {
    text: text.slice(from, to),
    starts: starts.slice(from, to),
    ends: ends.slice(from, to),
  };
}

export function findMatchRange(
  text: string,
  query: string
): TextMatchRange | null {
  const normalized = normalizeText(query);
  if (!normalized) return null;

  const mapped = normalizeWithMap(text);
  const index = mapped.text.indexOf(normalized);
  if (index < 0) return null;

  const start = mapped.starts[index];
  const end = mapped.ends[index + normalized.length - 1];
  if (start === undefined || end === undefined) return null;
  return { start, end };
}

/** Destaca ocorrências de um termo em um texto (retorna HTML seguro) */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const normalized = normalizeText(query);
  if (!normalized) return escapeHtml(text);
  const parts: string[] = [];
  let lastIndex = 0;
  const mapped = normalizeWithMap(text);
  let idx = mapped.text.indexOf(normalized);
  let searchFrom = 0;

  while (idx !== -1) {
    const start = mapped.starts[idx];
    const end = mapped.ends[idx + normalized.length - 1];
    if (start === undefined || end === undefined) break;

    parts.push(escapeHtml(text.slice(lastIndex, start)));
    parts.push(`<mark>${escapeHtml(text.slice(start, end))}</mark>`);
    lastIndex = end;
    searchFrom = idx + normalized.length;
    idx = mapped.text.indexOf(normalized, searchFrom);
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
