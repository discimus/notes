import {
  MicPermissionError,
  startAudioRecording,
  type AudioRecorderController,
  type RecordedAudio,
} from './audioRecorder.js';
import { formatMediaDuration } from './attachmentMedia.js';
import { playRecordingStartCue } from './audioCue.js';

export const CHAIN_AUDIO_KEY = 'chain';

export function noteAudioKey(noteId: string): string {
  return `note:${noteId}`;
}

export interface InlineAudioState {
  status: 'starting' | 'recording' | 'saving';
  elapsed: number;
}

export interface InlineAudioRecorderOptions {
  startRecordingFn?: () => Promise<AudioRecorderController>;
  recordStartCueFn?: () => void;
  onChange?: () => void;
  onError?: (message: string) => void;
  timerIntervalMs?: number;
}

export interface InlineAudioRecorder {
  getState: (key: string) => InlineAudioState | null;
  getActiveKey: () => string | null;
  toggle: (key: string, save: (recorded: RecordedAudio) => Promise<boolean>) => void;
  flush: () => void;
}

interface PendingRecording {
  key: string;
  save: (recorded: RecordedAudio) => Promise<boolean>;
}

interface ActiveRecording {
  key: string;
  controller: AudioRecorderController;
  startedAt: number;
  save: (recorded: RecordedAudio) => Promise<boolean>;
  saving: boolean;
}

function startFailureMessage(error: unknown): string {
  if (error instanceof MicPermissionError) {
    return 'Permissão de microfone negada.';
  }
  return error instanceof Error
    ? error.message
    : 'Não foi possível iniciar a gravação.';
}

export function createInlineAudioRecorder(
  options: InlineAudioRecorderOptions = {}
): InlineAudioRecorder {
  const startRecordingFn = options.startRecordingFn ?? startAudioRecording;
  const recordStartCueFn = options.recordStartCueFn ?? playRecordingStartCue;
  const intervalMs = options.timerIntervalMs ?? 250;
  let pending: PendingRecording | null = null;
  let active: ActiveRecording | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  const notify = (): void => {
    if (!destroyed) options.onChange?.();
  };

  const stopTimer = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };

  const ensureTimer = (): void => {
    if (timer !== null) return;
    timer = setInterval(() => {
      if (active) notify();
    }, intervalMs);
  };

  const settleSave = (
    recording: ActiveRecording,
    recorded: RecordedAudio
  ): void => {
    void recording
      .save(recorded)
      .then((saved) => {
        if (!saved) options.onError?.('Não foi possível salvar o áudio.');
      })
      .catch(() => options.onError?.('Não foi possível salvar o áudio.'))
      .finally(() => {
        if (active === recording) active = null;
        if (!active && !pending) stopTimer();
        notify();
      });
  };

  const stop = (recording: ActiveRecording): void => {
    if (recording.saving) return;
    recording.saving = true;
    stopTimer();
    notify();
    void recording.controller
      .stop()
      .then((recorded) => settleSave(recording, recorded))
      .catch(() => {
        if (active === recording) active = null;
        options.onError?.('Não foi possível salvar o áudio.');
        notify();
      });
  };

  const start = (
    key: string,
    save: (recorded: RecordedAudio) => Promise<boolean>
  ): void => {
    pending = { key, save };
    notify();

    void startRecordingFn()
      .then((controller) => {
        if (destroyed) {
          void controller.stop().then((recorded) => {
            void save(recorded).catch(() => undefined);
          }).catch(() => undefined);
          return;
        }
        if (pending?.key !== key) {
          controller.cancel();
          return;
        }
        pending = null;
        active = {
          key,
          controller,
          startedAt: Date.now(),
          save,
          saving: false,
        };
        ensureTimer();
        recordStartCueFn();
        notify();
      })
      .catch((error: unknown) => {
        if (pending?.key === key) pending = null;
        if (destroyed) return;
        options.onError?.(startFailureMessage(error));
        notify();
      });
  };

  const getState = (key: string): InlineAudioState | null => {
    if (pending?.key === key) return { status: 'starting', elapsed: 0 };
    if (active?.key !== key) return null;
    return {
      status: active.saving ? 'saving' : 'recording',
      elapsed: Math.max(0, (Date.now() - active.startedAt) / 1000),
    };
  };

  const toggle = (
    key: string,
    save: (recorded: RecordedAudio) => Promise<boolean>
  ): void => {
    if (active?.key === key) {
      stop(active);
      return;
    }
    if (pending?.key === key) return;
    if (active || pending) {
      options.onError?.('Finalize a gravação atual antes de iniciar outra.');
      return;
    }
    start(key, save);
  };

  const flush = (): void => {
    if (destroyed) return;
    destroyed = true;
    stopTimer();
    const recording = active;
    active = null;
    pending = null;
    if (!recording || recording.saving) return;
    void recording.controller
      .stop()
      .then((recorded) => {
        void recording.save(recorded).then((saved) => {
          if (!saved) options.onError?.('Não foi possível salvar o áudio.');
        }).catch(() => options.onError?.('Não foi possível salvar o áudio.'));
      })
      .catch(() => options.onError?.('Não foi possível salvar o áudio.'));
  };

  const getActiveKey = (): string | null => active?.key ?? pending?.key ?? null;

  return { getState, getActiveKey, toggle, flush };
}

export function paintInlineAudioButton(
  button: HTMLButtonElement,
  state: InlineAudioState | null,
  kind: 'chain' | 'note',
  idleEnabled: boolean
): void {
  const recording =
    state?.status === 'recording' || state?.status === 'saving';
  const busy = state?.status === 'starting' || state?.status === 'saving';
  const elapsed = state ? formatMediaDuration(state.elapsed) : '';
  const actionLabel = recording
    ? 'Parar e salvar áudio'
    : state?.status === 'starting'
      ? 'Solicitando microfone'
        : kind === 'chain'
        ? 'Gravar áudio em uma nova nota'
        : 'Gravar áudio nesta nota';

  button.classList.toggle(
    kind === 'chain' ? 'chain-quick-action--recording' : 'chain-note__attach--recording',
    recording
  );
  button.disabled = state ? busy : !idleEnabled;
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  button.setAttribute('aria-label', actionLabel);
  button.title = actionLabel;
  button.dataset['audioState'] = state?.status ?? 'idle';

  if (kind === 'chain') {
    const icon = button.querySelector<HTMLElement>('.chain-quick-action__icon');
    const label = button.querySelector<HTMLElement>('.chain-quick-action__label');
    if (icon) icon.textContent = recording ? 'stop' : 'mic';
    if (label) {
      label.textContent = state
        ? state.status === 'starting'
          ? 'Preparando'
          : state.status === 'saving'
            ? 'Salvando'
            : elapsed
        : 'Áudio';
    }
    return;
  }

  const icon = button.querySelector<HTMLElement>('.chain-note__audio-icon');
  const timer = button.querySelector<HTMLElement>('.chain-note__audio-timer');
  if (icon) icon.textContent = recording ? 'stop' : 'mic';
  if (timer) {
    timer.hidden = !state;
    timer.textContent = state
      ? state.status === 'starting'
        ? '…'
        : elapsed
      : '';
  }
}
