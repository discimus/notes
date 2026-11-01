import { describe, expect, it } from 'vitest';
import type { NoteDTO } from '@application/dto/index.js';
import {
  buildNotePeriods,
  notePeriodKey,
} from '@presentation/app/editorGrouping.js';

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12
): string {
  return new Date(year, monthIndex, day, hour).toISOString();
}

function makeNote(id: string, createdAt: string): NoteDTO {
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

describe('buildNotePeriods', () => {
  it('agrupa anos e meses disponíveis em ordem decrescente', () => {
    const notes = [
      makeNote('jan-1', localIso(2026, 0, 5)),
      makeNote('feb-1', localIso(2026, 1, 2)),
      makeNote('jan-2', localIso(2026, 0, 20)),
      makeNote('feb-2', localIso(2026, 1, 10)),
      makeNote('dec-2025', localIso(2025, 11, 20)),
      makeNote('may-2024', localIso(2024, 4, 1)),
    ];

    const years = buildNotePeriods(notes);

    expect(years.map((year) => year.year)).toEqual([2026, 2025, 2024]);
    expect(years[0]?.count).toBe(4);
    expect(years[0]?.months.map((month) => month.key)).toEqual([
      '2026-01',
      '2026-02',
    ]);
    expect(years[0]?.months[0]).toMatchObject({
      key: '2026-01',
      year: 2026,
      monthIndex: 0,
      monthLabel: 'Janeiro',
      count: 2,
      noteIds: ['jan-1', 'jan-2'],
    });
  });

  it('ignora datas inválidas', () => {
    const periods = buildNotePeriods([
      makeNote('invalid', 'invalid-date'),
      makeNote('valid', localIso(2026, 0, 5)),
    ]);

    expect(periods).toHaveLength(1);
    expect(periods[0]?.months[0]?.noteIds).toEqual(['valid']);
    expect(periods[0]?.months[0]?.count).toBe(1);
  });
});

describe('notePeriodKey', () => {
  it('deriva a chave do período no fuso local', () => {
    expect(notePeriodKey(new Date(2026, 0, 31, 23, 59))).toBe('2026-01');
    expect(notePeriodKey(new Date(2026, 1, 1, 0, 0))).toBe('2026-02');
  });
});
