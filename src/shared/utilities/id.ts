import type { UUID } from '../types/index.js';

/** Gera um UUID v4 usando a Web Crypto API nativa */
export function generateId(): UUID {
  return crypto.randomUUID();
}
