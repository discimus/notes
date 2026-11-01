import type { NoteDTO } from '@application/dto/index.js';
import { formatDateCompact } from '@shared/utilities/index.js';

export interface NoteDateGroup {
  key: string;
  label: string;
  fullLabel: string;
  notes: NoteDTO[];
}

export interface NotePeriodMonth {
  key: string;
  year: number;
  monthIndex: number;
  monthLabel: string;
  count: number;
  noteIds: string[];
}

export interface NotePeriodYear {
  year: number;
  count: number;
  months: NotePeriodMonth[];
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0]!.toLocaleUpperCase('pt-BR') + value.slice(1) : value;
}

function monthLabel(date: Date): string {
  return capitalize(date.toLocaleDateString('pt-BR', { month: 'long' }));
}

export function notePeriodKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function buildNotePeriods(notes: NoteDTO[]): NotePeriodYear[] {
  const sorted = [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const years = new Map<
    number,
    { year: number; count: number; months: Map<string, NotePeriodMonth> }
  >();

  for (const note of sorted) {
    const date = new Date(note.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const key = notePeriodKey(date);

    let yearEntry = years.get(year);
    if (!yearEntry) {
      yearEntry = { year, count: 0, months: new Map() };
      years.set(year, yearEntry);
    }

    let monthEntry = yearEntry.months.get(key);
    if (!monthEntry) {
      monthEntry = {
        key,
        year,
        monthIndex,
        monthLabel: monthLabel(date),
        count: 0,
        noteIds: [],
      };
      yearEntry.months.set(key, monthEntry);
    }

    monthEntry.count += 1;
    monthEntry.noteIds.push(note.id);
    yearEntry.count += 1;
  }

  return [...years.values()]
    .sort((a, b) => b.year - a.year)
    .map((yearEntry) => ({
      year: yearEntry.year,
      count: yearEntry.count,
      months: [...yearEntry.months.values()].sort(
        (a, b) => a.monthIndex - b.monthIndex
      ),
    }));
}

export function groupNotesByDate(notes: NoteDTO[]): NoteDateGroup[] {
  const groups = new Map<string, NoteDateGroup>();
  const sorted = [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const note of sorted) {
    const date = new Date(note.createdAt);
    const key = localDateKey(date);
    let group = groups.get(key);

    if (!group) {
      group = {
        key,
        label: formatDateCompact(note.createdAt),
        fullLabel: date.toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        notes: [],
      };
      groups.set(key, group);
    }

    group.notes.push(note);
  }

  return [...groups.values()];
}
