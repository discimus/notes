import { describe, expect, it } from 'vitest';
import {
  SCROLL_ACTION_COMPACT_DELTA_MIN,
  SCROLL_ACTION_COMPACT_SCROLL_MIN,
  SCROLL_ACTION_EXPAND_DELTA_MIN,
  SCROLL_ACTION_RESIZE_DELAY_MS,
} from '@presentation/app/scrollActionResize.js';

describe('scrollActionResize', () => {
  it('mantem uma configuracao universal para resize por scroll', () => {
    expect(SCROLL_ACTION_COMPACT_SCROLL_MIN).toBe(24);
    expect(SCROLL_ACTION_COMPACT_DELTA_MIN).toBe(4);
    expect(SCROLL_ACTION_EXPAND_DELTA_MIN).toBe(8);
    expect(SCROLL_ACTION_RESIZE_DELAY_MS).toBe(120);
  });
});
