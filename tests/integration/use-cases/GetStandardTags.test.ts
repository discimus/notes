import { describe, expect, it } from 'vitest';
import { GetStandardTags } from '@application/use-cases/GetStandardTags.js';

describe('GetStandardTags', () => {
  it('expõe o catálogo sem persistir tags', () => {
    const tags = new GetStandardTags().execute();
    const keys = tags.map((tag) => tag.normalizedName);

    expect(tags.length).toBeGreaterThanOrEqual(20);
    expect(new Set(keys).size).toBe(keys.length);
    expect(tags.find((tag) => tag.name === 'Programação')).toMatchObject({
      isStandard: true,
      chainCount: 0,
    });
    expect(tags.every((tag) => tag.id.startsWith('standard:'))).toBe(true);
  });
});
