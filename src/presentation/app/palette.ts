export type PaletteId =
  | 'violet'
  | 'teal'
  | 'green'
  | 'amber'
  | 'rose'
  | 'blue'
  | 'orange'
  | 'purple';

export interface PaletteDefinition {
  id: PaletteId;
  label: string;
  seed: string;
}

export const DEFAULT_PALETTE: PaletteId = 'violet';

export const PALETTES: readonly PaletteDefinition[] = [
  { id: 'violet', label: 'Violeta', seed: '#6750A4' },
  { id: 'teal', label: 'Verde-azulado', seed: '#00897B' },
  { id: 'green', label: 'Verde', seed: '#2E7D32' },
  { id: 'amber', label: 'Âmbar', seed: '#F9A825' },
  { id: 'rose', label: 'Rosa', seed: '#D81B60' },
  { id: 'blue', label: 'Azul', seed: '#1565C0' },
  { id: 'orange', label: 'Laranja', seed: '#E65100' },
  { id: 'purple', label: 'Roxo', seed: '#6A1B9A' },
];

const STORAGE_KEY = 'threadnotes.palette';

function isPaletteId(value: string | null): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value);
}

export function getStoredPalette(): PaletteId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPaletteId(stored) ? stored : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function applyPalette(palette: PaletteId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-palette', palette);
  const definition =
    PALETTES.find((item) => item.id === palette) ??
    PALETTES.find((item) => item.id === DEFAULT_PALETTE);
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );
  if (meta && definition) meta.content = definition.seed;
}

export function setPalette(palette: PaletteId): void {
  try {
    localStorage.setItem(STORAGE_KEY, palette);
  } catch {
    // Storage can be unavailable; the palette still applies in memory.
  }
  applyPalette(palette);
}

export function initPalette(): void {
  applyPalette(getStoredPalette());
}
