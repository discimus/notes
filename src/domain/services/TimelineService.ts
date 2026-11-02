import { TimelineView } from '../entities/index.js';
import type { TimelineEntry, TimelineFilter } from '../entities/index.js';
import type { Chain } from '../entities/index.js';

/**
 * Serviço de domínio: TimelineService.
 * Combina notas de múltiplas coleções em uma visualização cronológica.
 * Operação de leitura — não altera estruturas originais.
 */
export class TimelineService {
  /**
   * Cria uma visualização combinada a partir de múltiplas coleções.
   * As notas são ordenadas por createdAt com desempate por chainId+noteId.
   */
  createCombinedView(chains: Chain[], filter: TimelineFilter): TimelineView {
    const entries: TimelineEntry[] = [];

    for (const chain of chains) {
      if (!filter.chainIds.includes(chain.id)) continue;

      for (const note of chain.notes) {
        const noteData = note.toData();

        // Filtro temporal
        if (filter.from) {
          const noteTs = new Date(noteData.createdAt).getTime();
          const fromTs = new Date(filter.from).getTime();
          if (noteTs < fromTs) continue;
        }
        if (filter.to) {
          const noteTs = new Date(noteData.createdAt).getTime();
          const toTs = new Date(filter.to).getTime();
          if (noteTs > toTs) continue;
        }

        entries.push({
          note: noteData,
          chainId: chain.id,
          chainTitle: chain.displayTitle,
          tiebreaker: `${chain.id}:${note.id}`,
        });
      }
    }

    return TimelineView.create(entries, filter);
  }
}
