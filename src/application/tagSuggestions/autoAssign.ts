import type { NoteTagSuggestionDTO } from '../dto/index.js';

export const MAX_AUTO_TAGS_PER_NOTE = 3;
const MAX_CONSIDERED = 6;
const MIN_SCORE = 0.2;
const FALLBACK_SCORE = 0.4;

export function selectAutoAssignSuggestions(
  suggestions: readonly NoteTagSuggestionDTO[],
  assignedTagCount: number
): NoteTagSuggestionDTO[] {
  const budget = Math.max(0, MAX_AUTO_TAGS_PER_NOTE - assignedTagCount);
  if (budget === 0 || suggestions.length === 0) return [];

  const ranked = [...suggestions]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONSIDERED);
  const scoreSum = ranked.reduce((sum, item) => sum + item.score, 0);
  if (scoreSum <= 0) return [];

  const weightedAverage = ranked.reduce((sum, item) => sum + item.score ** 2, 0) / scoreSum;
  const selected = ranked
    .filter((item) => item.score >= weightedAverage && item.score >= MIN_SCORE)
    .slice(0, budget);

  if (selected.length === 0) {
    const top = ranked[0];
    if (top && top.score >= FALLBACK_SCORE) return [top];
  }

  return selected;
}
