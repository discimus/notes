import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@presentation/components/audioCue.js', () => ({
  playStartCue: vi.fn(),
  playEndCue: vi.fn(),
  playRecordingStartCue: vi.fn(),
}));

import { playStartCue } from '@presentation/components/audioCue.js';
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

describe('beep da cascata de áudio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(playStartCue).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('toca o beep antes de iniciar o próximo áudio automaticamente', () => {
    const players = [new FakePlayer(), new FakePlayer()];
    const rows = [document.createElement('div'), document.createElement('div')];
    const buttons = [document.createElement('button'), document.createElement('button')];
    document.body.append(...rows);

    createAudioCascade(
      players.map((player, index) => ({
        player: player as unknown as HTMLAudioElement,
        playBtn: buttons[index]!,
        row: rows[index]!,
      }))
    );

    players[0]!.play();
    players[0]!.ended = true;
    players[0]!.dispatchEvent(new Event('ended'));

    vi.advanceTimersByTime(300);

    expect(playStartCue).toHaveBeenCalledTimes(1);
    expect(players[1]!.play).toHaveBeenCalledTimes(1);
  });
});
