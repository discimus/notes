import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInlineAudioRecorder } from '@presentation/components/inlineAudioRecorder.js';

const recorded = {
  blob: new Blob(['audio'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  duration: 1,
};

describe('beep ao iniciar a gravação', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('toca o cue quando o microfone fica ativo', async () => {
    const controller = {
      elapsed: () => 0,
      stop: vi.fn().mockResolvedValue(recorded),
      cancel: vi.fn(),
    };
    const recordStartCueFn = vi.fn();
    const recorder = createInlineAudioRecorder({
      startRecordingFn: vi.fn().mockResolvedValue(controller),
      recordStartCueFn,
    });

    recorder.toggle('chain', vi.fn().mockResolvedValue(true));

    await vi.waitFor(() => {
      expect(recorder.getActiveKey()).toBe('chain');
      expect(recordStartCueFn).toHaveBeenCalledTimes(1);
    });

    recorder.flush();
  });

  it('não toca o cue quando a gravação falha ao iniciar', async () => {
    const recordStartCueFn = vi.fn();
    const recorder = createInlineAudioRecorder({
      startRecordingFn: vi.fn().mockRejectedValue(new Error('sem microfone')),
      recordStartCueFn,
      onError: vi.fn(),
    });

    recorder.toggle('chain', vi.fn().mockResolvedValue(true));

    await vi.waitFor(() => {
      expect(recorder.getActiveKey()).toBeNull();
    });
    expect(recordStartCueFn).not.toHaveBeenCalled();
  });
});
