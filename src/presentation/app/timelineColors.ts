const GOLDEN_ANGLE = 137.508;

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pastel(hue: number): string {
  return `hsl(${hue.toFixed(1)} 62% 72%)`;
}

export function getTimelineChainColors(chainIds: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  const used = new Set<string>();
  const uniqueIds = [...new Set(chainIds)].sort((a, b) => a.localeCompare(b));

  uniqueIds.forEach((chainId) => {
    let hue = hash(chainId) % 360;
    let attempts = 0;
    while (used.has(hue.toFixed(1)) && attempts < 360) {
      hue = (hue + GOLDEN_ANGLE) % 360;
      attempts += 1;
    }
    used.add(hue.toFixed(1));
    colors.set(chainId, pastel(hue));
  });

  return colors;
}
