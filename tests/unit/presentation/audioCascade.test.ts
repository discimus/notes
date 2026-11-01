import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudioCascade } from '@presentation/components/audioCascade.js';

class FakePlayer extends EventTarget {
  paused = true;
  ended = false;

  play = vi.fn(() => {
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });

  pause = vi.fn(() => {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  });
}

function setup() {
  const players = [new FakePlayer(), new FakePlayer()];
  const rows = [document.createElement('div'), document.createElement('div')];
  const buttons = [document.createElement('button'), document.createElement('button')];
  document.body.append(...rows);
  const cascade = createAudioCascade(
    players.map((player, index) => ({
      player: player as unknown as HTMLAudioElement,
      playBtn: buttons[index]!,
      row: rows[index]!,
    }))
  );
  return { players, rows, cascade };
}

describe('cascata de áudio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('agenda o próximo áudio depois que o atual termina', () => {
    const { players, rows } = setup();

    players[0]!.play();
    players[0]!.ended = true;
    players[0]!.dispatchEvent(new Event('ended'));

    expect(rows[1]!.classList.contains('chain-attachment--next')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(players[1]!.play).toHaveBeenCalledTimes(1);
  });

  it('cancela a sequência ao pausar o áudio atual', () => {
    const { players, rows } = setup();

    players[0]!.play();
    players[0]!.pause();

    vi.advanceTimersByTime(500);
    expect(rows[1]!.classList.contains('chain-attachment--next')).toBe(false);
    expect(players[1]!.play).not.toHaveBeenCalled();
  });
});
