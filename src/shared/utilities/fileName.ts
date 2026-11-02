export const AUTO_FILE_NAME_WORDS = 4;
const MAX_FILE_NAME_SLUG_LENGTH = 48;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function noteFileTimestamp(date: Date): string {
  return `${pad2(date.getFullYear() % 100)}${pad2(date.getMonth() + 1)}${pad2(
    date.getDate()
  )}${pad2(date.getHours())}`;
}

export function asciiFileNameSlug(
  content: string,
  maxWords = AUTO_FILE_NAME_WORDS
): string {
  const words = content
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .slice(0, Math.max(1, maxWords));

  const slug = words.join('-').slice(0, MAX_FILE_NAME_SLUG_LENGTH).replace(/-+$/g, '');
  return slug || 'nota';
}

export function buildNoteFileName(params: {
  content: string;
  extension: string;
  timestamp: Date;
  maxWords?: number;
}): string {
  const extension = params.extension.replace(/^\./, '').toLowerCase() || 'txt';
  const slug = asciiFileNameSlug(
    params.content,
    params.maxWords ?? AUTO_FILE_NAME_WORDS
  );
  return `${noteFileTimestamp(params.timestamp)}-${slug}.${extension}`;
}

function splitFileName(fileName: string): { base: string; extension: string } {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return { base: fileName, extension: '' };
  return { base: fileName.slice(0, dot), extension: fileName.slice(dot) };
}

export function uniqueFileName(
  fileName: string,
  existingNames: ReadonlySet<string>
): string {
  const normalized = new Set(
    [...existingNames].map((name) => name.toLowerCase())
  );
  if (!normalized.has(fileName.toLowerCase())) return fileName;

  const { base, extension } = splitFileName(fileName);
  let counter = 2;
  while (true) {
    const candidate = `${base}-${String(counter).padStart(2, '0')}${extension}`;
    if (!normalized.has(candidate.toLowerCase())) return candidate;
    counter += 1;
  }
}
