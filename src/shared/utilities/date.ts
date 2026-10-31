import type { ISODateString } from '../types/index.js';

/** Retorna o timestamp atual como string ISO 8601 */
export function now(): ISODateString {
  return new Date().toISOString();
}

/** Formata uma data ISO para exibição amigável */
export function formatDate(iso: ISODateString): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) {
    return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (isSameDay(date, yesterday)) {
    return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formata apenas a hora */
export function formatTime(iso: ISODateString): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formata data completa para acessibilidade */
export function formatDateFull(iso: ISODateString): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Compara dois ISODateStrings para ordenação */
export function compareDates(a: ISODateString, b: ISODateString): number {
  return new Date(a).getTime() - new Date(b).getTime();
}
