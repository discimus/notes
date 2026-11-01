export function formatMediaDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const remainder = String(safe % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}
