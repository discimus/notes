import { describe, expect, it } from 'vitest';
import {
  formatPlaybackRate,
  nextPlaybackRate,
} from '@presentation/components/audioSpeed.js';

describe('velocidade de áudio', () => {
  it('cicla 1x, 1,5x e 2x', () => {
    expect(nextPlaybackRate(1)).toBe(1.5);
    expect(nextPlaybackRate(1.5)).toBe(2);
    expect(nextPlaybackRate(2)).toBe(1);
    expect(nextPlaybackRate(9)).toBe(1);
  });

  it('formata a velocidade em pt-BR', () => {
    expect(formatPlaybackRate(1.5)).toBe('1,5\u00d7');
    expect(formatPlaybackRate(2)).toBe('2\u00d7');
  });
});
