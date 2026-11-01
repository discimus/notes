export interface CascadeEntry {
  player: HTMLAudioElement;
  playBtn: HTMLButtonElement;
  row: HTMLElement;
}

export interface AudioCascadeOptions {
  gapMs?: number;
  onError?: () => void;
}

export interface AudioCascade {
  stop(): void;
}

const NEXT_CLASS = 'chain-attachment--next';
const DEFAULT_GAP_MS = 300;

export function createAudioCascade(
  entries: CascadeEntry[],
  options: AudioCascadeOptions = {}
): AudioCascade {
  const gapMs = options.gapMs ?? DEFAULT_GAP_MS;
  let current: number | null = null;
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const autoStarting = new Set<number>();

  const clearQueuedVisual = (): void => {
    for (const entry of entries) entry.row.classList.remove(NEXT_CLASS);
  };

  const cancelTimer = (): void => {
    if (timer === null) return;
    globalThis.clearTimeout(timer);
    timer = null;
  };

  const pauseOthers = (except: number): void => {
    entries.forEach((entry, index) => {
      if (index === except) return;
      if (!entry.player.paused) entry.player.pause();
    });
  };

  const stopCascade = (): void => {
    cancelTimer();
    current = null;
    autoStarting.clear();
    clearQueuedVisual();
  };

  const scheduleNext = (index: number): void => {
    const next = index + 1;
    if (next >= entries.length) {
      current = null;
      return;
    }
    const entry = entries[next];
    if (!entry || !entry.row.isConnected) {
      current = null;
      return;
    }

    entry.row.classList.add(NEXT_CLASS);
    timer = globalThis.setTimeout(() => {
      timer = null;
      clearQueuedVisual();
      if (!entry.row.isConnected) {
        current = null;
        return;
      }
      current = next;
      autoStarting.add(next);
      pauseOthers(next);
      entry.player.play().catch(() => {
        autoStarting.delete(next);
        stopCascade();
        options.onError?.();
      });
    }, gapMs);
  };

  entries.forEach((entry, index) => {
    entry.player.addEventListener('play', () => {
      if (autoStarting.has(index)) {
        autoStarting.delete(index);
        return;
      }
      current = index;
      cancelTimer();
      pauseOthers(index);
      clearQueuedVisual();
    });

    entry.player.addEventListener('ended', () => {
      if (current === index) scheduleNext(index);
    });

    entry.player.addEventListener('pause', () => {
      if (current === index && !entry.player.ended) stopCascade();
    });
  });

  return { stop: stopCascade };
}
