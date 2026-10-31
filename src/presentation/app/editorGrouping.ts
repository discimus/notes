import type { NoteDTO } from '@application/dto/index.js';
import { formatDateCompact } from '@shared/utilities/index.js';

export interface NoteDateGroup {
  key: string;
  label: string;
  fullLabel: string;
  notes: NoteDTO[];
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
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
