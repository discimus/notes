import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeAudioProgress,
  createAudioPlayer,
  stopAttachmentAudio,
} from '@presentation/components/audioPlayer.js';

describe('player de áudio', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    stopAttachmentAudio();
    vi.restoreAllMocks();
  });

  it('calcula progresso de forma segura', () => {
    expect(computeAudioProgress(10, 4)).toEqual({ percent: 0.4, remaining: 6 });
    expect(computeAudioProgress(Number.NaN, 4)).toEqual({
      percent: 0,
      remaining: 0,
    });
  });

  it('mostra a duração total e esconde a barra em repouso', () => {
    const control = createAudioPlayer('blob:audio', undefined, 10, 'audio/webm');

    expect(control.playBtn.disabled).toBe(false);
    expect(control.durationEl.textContent).toBe('00:10');
    expect(control.progressBar.hasAttribute('hidden')).toBe(true);
  });

  it('revela progresso e tempo restante durante a reprodução', () => {
    const control = createAudioPlayer('blob:audio', undefined, 10, 'audio/webm');
    Object.defineProperty(control.player, 'duration', {
      value: 10,
      configurable: true,
    });
    Object.defineProperty(control.player, 'currentTime', {
      value: 4,
      writable: true,
      configurable: true,
    });

    control.playBtn.click();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

    control.player.dispatchEvent(new Event('play'));
    expect(control.progressBar.hasAttribute('hidden')).toBe(false);
    expect(control.durationEl.className).toContain('--remaining');

    frames.shift()?.(0);
    const fill = control.progressBar.querySelector<HTMLElement>(
      '.chain-attachment__progress-fill'
    );
    expect(fill?.style.width).toBe('40%');
    expect(control.durationEl.textContent).toBe('\u201300:06');
    expect(control.progressBar.getAttribute('aria-valuenow')).toBe('4');
    expect(control.progressBar.getAttribute('aria-valuemax')).toBe('10');
  });

  it('esconde a barra e restaura a duração ao pausar ou terminar', () => {
    const control = createAudioPlayer('blob:audio', undefined, 10, 'audio/webm');

    control.player.dispatchEvent(new Event('play'));
    control.player.dispatchEvent(new Event('pause'));
    expect(control.progressBar.hasAttribute('hidden')).toBe(true);
    expect(control.durationEl.textContent).toBe('00:10');

    control.player.dispatchEvent(new Event('play'));
    control.player.dispatchEvent(new Event('ended'));
    expect(control.progressBar.hasAttribute('hidden')).toBe(true);
    expect(control.durationEl.textContent).toBe('00:10');
  });

  it('define a fonte tardiamente e habilita o play', () => {
    const control = createAudioPlayer('', undefined, 5, 'audio/webm');
    expect(control.playBtn.disabled).toBe(true);

    control.setSource('blob:audio', 'audio/webm');
    expect(control.playBtn.disabled).toBe(false);
    expect(control.player.getAttribute('type')).toBe('audio/webm');
  });
});
