import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@presentation/components/audioCue.js', () => ({
  playStartCue: vi.fn(),
  playEndCue: vi.fn(),
  playRecordingStartCue: vi.fn(),
}));

import {
  playEndCue,
  playStartCue,
} from '@presentation/components/audioCue.js';
import {
  createAudioPlayer,
  stopAttachmentAudio,
} from '@presentation/components/audioPlayer.js';

describe('beeps do player de áudio', () => {
  beforeEach(() => {
    vi.mocked(playStartCue).mockClear();
    vi.mocked(playEndCue).mockClear();
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  afterEach(() => {
    stopAttachmentAudio();
    vi.restoreAllMocks();
  });

  it('toca o beep apenas ao iniciar do começo', () => {
    const control = createAudioPlayer('blob:audio', undefined, 10, 'audio/webm');
    Object.defineProperty(control.player, 'currentTime', {
      value: 0,
      writable: true,
      configurable: true,
    });

    control.playBtn.click();
    expect(playStartCue).toHaveBeenCalledTimes(1);

    control.player.dispatchEvent(new Event('play'));
    control.player.dispatchEvent(new Event('pause'));
    control.player.currentTime = 4;
    control.playBtn.click();

    expect(playStartCue).toHaveBeenCalledTimes(1);
  });

  it('toca o beep de fim quando a execução termina', () => {
    const control = createAudioPlayer('blob:audio', undefined, 10, 'audio/webm');

    control.player.dispatchEvent(new Event('ended'));

    expect(playEndCue).toHaveBeenCalledTimes(1);
  });
});
