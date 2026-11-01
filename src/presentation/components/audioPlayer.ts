import { el } from '../dom.js';
import { formatMediaDuration } from './attachmentMedia.js';

export interface AudioPlayerControls {
  player: HTMLAudioElement;
  playBtn: HTMLButtonElement;
  progressBar: HTMLDivElement;
  durationEl: HTMLSpanElement;
  setPlaybackRate: (rate: number) => void;
  setSource: (url: string, mimeType?: string) => void;
}

export interface AudioProgress {
  percent: number;
  remaining: number;
}

let currentPlayer: HTMLAudioElement | null = null;

export function stopAttachmentAudio(): void {
  currentPlayer?.pause();
  currentPlayer = null;
}

export function computeAudioProgress(total: number, currentTime: number): AudioProgress {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const safeCurrent =
    Number.isFinite(currentTime) && currentTime > 0
      ? Math.min(currentTime, safeTotal)
      : 0;
  return {
    percent:
      safeTotal > 0 ? Math.min(1, Math.max(0, safeCurrent / safeTotal)) : 0,
    remaining: Math.max(0, safeTotal - safeCurrent),
  };
}

function icon(name: string): string {
  return `<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
}

export function createAudioPlayer(
  sourceUrl: string,
  onError: (() => void) | undefined,
  knownDuration?: number,
  mimeType?: string
): AudioPlayerControls {
  const player = el('audio', 'chain-attachment__player') as HTMLAudioElement;
  player.preload = 'metadata';
  if (mimeType) player.setAttribute('type', mimeType);

  const playBtn = el('button', 'btn-icon chain-attachment__action chain-attachment__play');
  playBtn.type = 'button';
  playBtn.innerHTML = icon('play_arrow');
  playBtn.setAttribute('aria-label', 'Reproduzir áudio');
  playBtn.title = 'Reproduzir áudio';
  playBtn.disabled = !sourceUrl;

  const durationEl = el('span', 'chain-attachment__duration');
  durationEl.textContent = formatMediaDuration(knownDuration ?? 0);

  const progressBar = el('div', 'chain-attachment__progress');
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-label', 'Progresso do áudio');
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', String(Math.round(knownDuration ?? 0)));
  progressBar.setAttribute('aria-valuenow', '0');
  progressBar.setAttribute('hidden', '');

  const progressFill = el('div', 'chain-attachment__progress-fill');
  progressBar.appendChild(progressFill);

  let playing = false;
  let playbackRate = 1;
  let rafId: number | null = null;

  const setSource = (url: string, nextMimeType?: string): void => {
    if (!url) return;
    if (nextMimeType) player.setAttribute('type', nextMimeType);
    if (player.src !== url) {
      player.src = url;
      player.load();
    }
    playBtn.disabled = false;
  };

  if (sourceUrl) setSource(sourceUrl, mimeType);

  const applyPlaybackRate = (): void => {
    if (player.playbackRate !== playbackRate) player.playbackRate = playbackRate;
  };

  const setPlaybackRate = (rate: number): void => {
    playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    applyPlaybackRate();
  };

  const resolveTotal = (): number => {
    const live = player.duration;
    return Number.isFinite(live) && live > 0 ? live : (knownDuration ?? 0);
  };

  const renderTick = (): void => {
    const total = resolveTotal();
    const { percent, remaining } = computeAudioProgress(total, player.currentTime);
    const elapsed = Math.min(
      Math.max(0, Math.floor(player.currentTime)),
      Math.floor(total)
    );
    progressFill.style.width = `${Math.round(percent * 100)}%`;
    progressBar.setAttribute('aria-valuenow', String(elapsed));
    progressBar.setAttribute('aria-valuemax', String(Math.floor(total)));
    durationEl.textContent = `\u2013${formatMediaDuration(remaining)}`;
    if (playing && typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(renderTick);
    } else {
      rafId = null;
    }
  };

  const startProgress = (): void => {
    progressBar.removeAttribute('hidden');
    durationEl.className =
      'chain-attachment__duration chain-attachment__duration--remaining';
    if (rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
    }
    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(renderTick);
    } else {
      renderTick();
    }
  };

  const stopProgress = (): void => {
    if (rafId !== null) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
      rafId = null;
    }
    progressBar.setAttribute('hidden', '');
    durationEl.className = 'chain-attachment__duration';
    durationEl.textContent = formatMediaDuration(resolveTotal());
  };

  playBtn.addEventListener('click', () => {
    if (!player.src) {
      onError?.();
      return;
    }
    if (playing) {
      player.pause();
      return;
    }
    if (player.ended) player.currentTime = 0;
    player.play().catch(() => onError?.());
  });

  player.addEventListener('play', () => {
    if (currentPlayer && currentPlayer !== player) currentPlayer.pause();
    currentPlayer = player;
    playing = true;
    applyPlaybackRate();
    playBtn.innerHTML = icon('pause');
    playBtn.setAttribute('aria-label', 'Pausar áudio');
    playBtn.title = 'Pausar áudio';
    startProgress();
  });
  player.addEventListener('loadedmetadata', applyPlaybackRate);
  player.addEventListener('pause', () => {
    playing = false;
    playBtn.innerHTML = icon('play_arrow');
    playBtn.setAttribute('aria-label', 'Reproduzir áudio');
    playBtn.title = 'Reproduzir áudio';
    stopProgress();
  });
  player.addEventListener('ended', () => {
    playing = false;
    playBtn.innerHTML = icon('play_arrow');
    playBtn.setAttribute('aria-label', 'Reproduzir áudio');
    playBtn.title = 'Reproduzir áudio';
    stopProgress();
  });
  player.addEventListener('error', () => {
    stopProgress();
    onError?.();
  });

  return { player, playBtn, progressBar, durationEl, setPlaybackRate, setSource };
}
