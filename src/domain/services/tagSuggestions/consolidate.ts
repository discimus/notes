import type { ConsolidatedTagSuggestion, ConsolidationContext } from './types.js';
import {
  scoreAndConsolidateSuggestions,
  type WeightedKeywords,
} from './scoring.js';

export type { WeightedKeywords } from './scoring.js';

/**
 * Mantém o contrato histórico da consolidação. A pontuação detalhada
 * (título, conteúdo, notas relacionadas e contexto) vive em scoring.ts.
 */
export function consolidateSuggestions(
  results: readonly WeightedKeywords[],
  context: ConsolidationContext
): ConsolidatedTagSuggestion[] {
  return scoreAndConsolidateSuggestions(results, context);
}
