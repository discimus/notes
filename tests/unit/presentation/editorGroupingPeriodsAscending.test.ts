import { describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import { buildNotePeriods } from '@presentation/app/editorGrouping.js';

function localIso(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day, 12).toISOString();
}

function note(id: string, createdAt: string): NoteDTO {
  return {
    id,
    content: id,
    chainId: 'chain-1',
    position: 0,
    role: 'tail',
    createdAt,
    updatedAt: createdAt,
  };
}

describe('buildNotePeriods em ordem crescente', () => {
  it('lista anos e meses dos mais antigos para os mais recentes', () => {
    const periods = buildNotePeriods(
      [
        note('jan-2026', localIso(2026, 0, 5)),
        note('feb-2026', localIso(2026, 1, 2)),
        note('dec-2025', localIso(2025, 11, 20)),
        note('may-2024', localIso(2024, 4, 1)),
      ],
      'asc'
    );

    expect(periods.map((period) => period.year)).toEqual([2024, 2025, 2026]);
    expect(periods[2]?.months.map((month) => month.key)).toEqual([
      '2026-01',
      '2026-02',
    ]);
  });
});
