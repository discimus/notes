export interface LinkTextSegment {
  type: 'text';
  value: string;
}

export interface LinkUrlSegment {
  type: 'link';
  value: string;
  href: string;
}

export type LinkSegment = LinkTextSegment | LinkUrlSegment;

const LINK_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
const CLOSING_BRACKETS: Record<string, string> = {
  ')': '(',
  ']': '[',
  '}': '{',
};
const TRAILING_QUOTES = ['"', "'", '`', '”', '’'];

function countOccurrences(value: string, char: string): number {
  return value.split(char).length - 1;
}

function trimTrailingPunctuation(raw: string): string {
  let value = raw;

  while (value.length > 0) {
    const withoutPunctuation = value.replace(TRAILING_PUNCTUATION, '');
    if (withoutPunctuation !== value) {
      value = withoutPunctuation;
      continue;
    }

    const last = value[value.length - 1];
    if (!last) break;

    if (TRAILING_QUOTES.includes(last)) {
      value = value.slice(0, -1);
      continue;
    }

    const opening = CLOSING_BRACKETS[last];
    if (opening && countOccurrences(value, last) > countOccurrences(value, opening)) {
      value = value.slice(0, -1);
      continue;
    }

    break;
  }

  return value;
}

function toHref(value: string): string | null {
  const candidate = /^www\./i.test(value) ? `https://${value}` : value;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function findLinks(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  const pattern = new RegExp(LINK_PATTERN.source, LINK_PATTERN.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const value = trimTrailingPunctuation(raw);

    segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });

    if (!value) {
      segments.push({ type: 'text', value: raw });
    } else {
      const href = toHref(value);
      if (href) {
        segments.push({ type: 'link', value, href });
        const trailing = raw.slice(value.length);
        if (trailing) segments.push({ type: 'text', value: trailing });
      } else {
        segments.push({ type: 'text', value: raw });
      }
    }

    lastIndex = match.index + raw.length;
  }

  segments.push({ type: 'text', value: text.slice(lastIndex) });

  return segments.reduce<LinkSegment[]>((merged, segment) => {
    if (!segment.value) return merged;

    const previous = merged[merged.length - 1];
    if (segment.type === 'text' && previous?.type === 'text') {
      previous.value += segment.value;
      return merged;
    }

    merged.push({ ...segment });
    return merged;
  }, []);
}
