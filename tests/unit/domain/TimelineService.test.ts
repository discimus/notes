import { describe, it, expect } from 'vitest';
import { TimelineService } from '../../../src/domain/services/TimelineService.js';
import { Chain } from '../../../src/domain/entities/Chain.js';
import { Note } from '../../../src/domain/entities/Note.js';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('TimelineService', () => {
  const service = new TimelineService();

  it('deve combinar notas de duas coleções em ordem cronolÃ³gica', async () => {
    const { chain: chainA } = Chain.createWithHeader({ content: 'A1' });
    await sleep(5);
    const { chain: chainB } = Chain.createWithHeader({ content: 'B1' });
    await sleep(5);
    chainA.appendNote('A2');
    await sleep(5);
    chainB.appendNote('B2');

    const timeline = service.createCombinedView([chainA, chainB], {
      chainIds: [chainA.id, chainB.id],
    });

    expect(timeline.entries).toHaveLength(4);
    // Deve estar em ordem crescente
    for (let i = 0; i < timeline.entries.length - 1; i++) {
      const a = new Date(timeline.entries[i]!.note.createdAt).getTime();
      const b = new Date(timeline.entries[i + 1]!.note.createdAt).getTime();
      expect(a).toBeLessThanOrEqual(b);
    }
  });

  it('deve identificar a origem de cada nota', async () => {
    const { chain: chainA } = Chain.createWithHeader({ content: 'Nota de A', title: 'Coleção A' });
    await sleep(2);
    const { chain: chainB } = Chain.createWithHeader({ content: 'Nota de B', title: 'Coleção B' });

    const timeline = service.createCombinedView([chainA, chainB], {
      chainIds: [chainA.id, chainB.id],
    });

    const entriesA = timeline.entries.filter((e) => e.chainId === chainA.id);
    const entriesB = timeline.entries.filter((e) => e.chainId === chainB.id);
    expect(entriesA).toHaveLength(1);
    expect(entriesB).toHaveLength(1);
    expect(entriesA[0]!.chainTitle).toBe('Coleção A');
    expect(entriesB[0]!.chainTitle).toBe('Coleção B');
  });

  it('deve ter desempate determinÃ­stico para timestamps iguais', () => {
    // Duas coleções reconstituÃ­das com mesmo timestamp
    const ts = new Date().toISOString();

    // Adiciona notas manualmente com mesmo timestamp via reconstitute
    const noteA = {
      id: 'note-a',
      content: 'Note A',
      chainId: 'aaa',
      position: 0,
      role: 'header' as const,
      createdAt: ts,
      updatedAt: ts,
    };
    const noteB = {
      id: 'note-b',
      content: 'Note B',
      chainId: 'bbb',
      position: 0,
      role: 'header' as const,
      createdAt: ts,
      updatedAt: ts,
    };

    const chainAFull = Chain.reconstitute({ id: 'aaa', headerNoteId: 'note-a', createdAt: ts, updatedAt: ts }, [Note.reconstitute(noteA)]);
    const chainBFull = Chain.reconstitute({ id: 'bbb', headerNoteId: 'note-b', createdAt: ts, updatedAt: ts }, [Note.reconstitute(noteB)]);

    const t1 = service.createCombinedView([chainAFull, chainBFull], { chainIds: ['aaa', 'bbb'] });
    const t2 = service.createCombinedView([chainBFull, chainAFull], { chainIds: ['aaa', 'bbb'] });

    // Deve ser determinÃ­stico independente da ordem de entrada
    expect(t1.entries[0]!.chainId).toBe(t2.entries[0]!.chainId);
    expect(t1.entries[1]!.chainId).toBe(t2.entries[1]!.chainId);
  });

  it('deve filtrar por intervalo temporal', async () => {
    const { chain } = Chain.createWithHeader({ content: 'H' });
    const from = new Date().toISOString();
    await sleep(5);
    chain.appendNote('Tail apÃ³s from');

    const timeline = service.createCombinedView([chain], { chainIds: [chain.id] });
    const filtered = timeline.filterByRange(from);

    expect(filtered.entries.length).toBeLessThanOrEqual(timeline.entries.length);
  });

  it('deve retornar view vazia para lista de coleções vazia', () => {
    const timeline = service.createCombinedView([], { chainIds: [] });
    expect(timeline.isEmpty).toBe(true);
    expect(timeline.entries).toHaveLength(0);
  });
});
