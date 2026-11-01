export const PLAYBACK_RATES = [1, 1.5, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export function nextPlaybackRate(current: number): PlaybackRate {
  const index = PLAYBACK_RATES.indexOf(current as PlaybackRate);
  if (index === -1) return PLAYBACK_RATES[0];
  return PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]!;
}

export function formatPlaybackRate(rate: number): string {
  return `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}\u00d7`;
}
