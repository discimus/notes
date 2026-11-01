import { afterEach, describe, expect, it, vi } from 'vitest';
import { showAudioRecorderDialog } from '@presentation/components/AudioRecorderDialog.js';

describe('diálogo de gravação de áudio', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('inicia, para e salva a gravação', async () => {
    const recorded = {
      blob: new Blob(['audio'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      duration: 5,
    };
    const stop = vi.fn().mockResolvedValue(recorded);
    const cancel = vi.fn();
    const onSave = vi.fn().mockResolvedValue(true);
    const result = showAudioRecorderDialog({
      noteTitle: 'Nota de teste',
      onSave,
      startRecordingFn: async () => ({
        elapsed: () => 5,
        stop,
        cancel,
      }),
    });

    const primary = document.querySelector<HTMLButtonElement>(
      '#audio-recorder-primary'
    );
    primary?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('#audio-recorder-status')?.textContent).toBe(
        'Gravando…'
      );
    });

    primary?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('#audio-recorder-title')).toBeNull();
    });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(recorded);
    await expect(result).resolves.toBe(true);
  });

  it('mantém o diálogo aberto quando o microfone é negado', async () => {
    showAudioRecorderDialog({
      noteTitle: 'Nota',
      onSave: vi.fn().mockResolvedValue(true),
      startRecordingFn: async () => {
        throw new Error('Permissão de microfone negada.');
      },
    });

    document.querySelector<HTMLButtonElement>('#audio-recorder-primary')?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('#audio-recorder-status')?.textContent).toBe(
        'Permissão de microfone negada.'
      );
    });
    expect(document.querySelector('#audio-recorder-title')).not.toBeNull();

    document.querySelector<HTMLButtonElement>('#audio-recorder-cancel')?.click();
  });
});
