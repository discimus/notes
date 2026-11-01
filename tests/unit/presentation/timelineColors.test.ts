import { describe, expect, it } from 'vitest';
import { getTimelineChainColors } from '@presentation/app/timelineColors.js';

describe('Cores da timeline', () => {
  it('atribui cores pastel determinísticas e estáveis', () => {
    const first = getTimelineChainColors(['chain-b', 'chain-a']);
    const second = getTimelineChainColors(['chain-a', 'chain-b']);

    expect([...first.entries()]).toEqual([...second.entries()]);
    expect(first.get('chain-a')).toMatch(/^hsl\(\d+\.\d 62% 72%\)$/);
    expect(first.get('chain-b')).toMatch(/^hsl\(\d+\.\d 62% 72%\)$/);
  });

  it('evita repetir a mesma cor na seleção', () => {
    const colors = getTimelineChainColors(
      Array.from({ length: 20 }, (_, index) => `chain-${index}`)
    );

    expect(new Set(colors.values()).size).toBe(20);
  });
});
