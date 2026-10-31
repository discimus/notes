import { describe, expect, it } from 'vitest';
import { formatDateCompact } from '@shared/utilities/index.js';

describe('formatDateCompact', () => {
  it('usa rótulos curtos para hoje e ontem', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);

    expect(formatDateCompact(new Date().toISOString())).toBe('Hoje');
    expect(formatDateCompact(yesterday.toISOString())).toBe('Ontem');
  });

  it('formata datas antigas com dia, mês curto e ano', () => {
    const oldDate = new Date(2020, 11, 31, 12, 0, 0);

    expect(formatDateCompact(oldDate.toISOString())).toBe('31 dez 2020');
  });
});
