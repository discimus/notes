import { el } from '../dom.js';
import { escapeHtml } from '@shared/utilities/index.js';
import { mountDialog } from './Dialog.js';
import {
  MicPermissionError,
  RecordingCancelledError,
  startAudioRecording,
  type AudioRecorderController,
  type RecordedAudio,
} from './audioRecorder.js';
import { formatMediaDuration } from './attachmentMedia.js';

export interface AudioRecorderDialogOptions {
  noteTitle: string;
  onSave: (result: RecordedAudio) => Promise<boolean>;
  startRecordingFn?: () => Promise<AudioRecorderController>;
}

export function showAudioRecorderDialog(
  options: AudioRecorderDialogOptions
): Promise<boolean> {
  if (document.getElementById('audio-recorder-title')) {
    return Promise.resolve(false);
  }

  const backdrop = el('div', 'dialog-backdrop');
  backdrop.setAttribute('role', 'presentation');

  const dialog = el('div', 'dialog audio-recorder');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'audio-recorder-title');
  dialog.setAttribute('aria-describedby', 'audio-recorder-status');

  dialog.innerHTML = `
    <div class="dialog__header">
      <div>
        <h2 id="audio-recorder-title" class="dialog__title">Gravar áudio</h2>
        <p class="dialog__body dialog__body--left">${escapeHtml(options.noteTitle || 'Nota')}</p>
      </div>
      <button class="btn-icon" id="audio-recorder-close" type="button" aria-label="Fechar gravação" title="Fechar">
        <span class="material-symbols-rounded" aria-hidden="true">close</span>
      </button>
    </div>
    <div class="audio-recorder__body">
      <span class="material-symbols-rounded audio-recorder__icon" aria-hidden="true">mic</span>
      <p class="audio-recorder__timer" id="audio-recorder-timer" role="timer" aria-label="Tempo de gravação">00:00</p>
      <p class="audio-recorder__status" id="audio-recorder-status" aria-live="polite">Pronto para gravar.</p>
    </div>
    <div class="dialog__actions">
      <button class="btn btn-text" id="audio-recorder-cancel" type="button">Cancelar</button>
      <button class="btn btn-filled" id="audio-recorder-primary" type="button" data-autofocus>
        <span class="material-symbols-rounded" aria-hidden="true">mic</span>
        <span id="audio-recorder-primary-label">Iniciar gravação</span>
      </button>
    </div>
  `;

  backdrop.appendChild(dialog);

  const status = dialog.querySelector<HTMLElement>('#audio-recorder-status')!;
  const timer = dialog.querySelector<HTMLElement>('#audio-recorder-timer')!;
  const primary = dialog.querySelector<HTMLButtonElement>('#audio-recorder-primary')!;
  const primaryLabel = dialog.querySelector<HTMLElement>('#audio-recorder-primary-label')!;
  const primaryIcon = primary.querySelector<HTMLElement>('.material-symbols-rounded');
  const close = dialog.querySelector<HTMLButtonElement>('#audio-recorder-close')!;
  const cancel = dialog.querySelector<HTMLButtonElement>('#audio-recorder-cancel')!;
  const startRecordingFn = options.startRecordingFn ?? startAudioRecording;

  let recorder: AudioRecorderController | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let settled = false;
  let saving = false;
  let resolveResult: (saved: boolean) => void = () => {};
  let destroyDialog = (): void => {};

  const result = new Promise<boolean>((resolve) => {
    resolveResult = resolve;
  });

  const stopTimer = (): void => {
    if (interval !== null) clearInterval(interval);
    interval = null;
  };

  const setRecordingState = (recording: boolean): void => {
    primaryLabel.textContent = recording ? 'Parar e salvar' : 'Iniciar gravação';
    if (primaryIcon) primaryIcon.textContent = recording ? 'stop' : 'mic';
    primary.disabled = saving;
    status.textContent = recording ? 'Gravando…' : 'Pronto para gravar.';
  };

  const settle = (saved: boolean): void => {
    if (settled || (saving && !saved)) return;
    settled = true;
    stopTimer();
    recorder?.cancel();
    recorder = null;
    destroyDialog();
    resolveResult(saved);
  };

  const start = async (): Promise<void> => {
    if (saving || recorder) return;
    primary.disabled = true;
    status.textContent = 'Solicitando microfone…';
    try {
      const controller = await startRecordingFn();
      if (settled) {
        controller.cancel();
        return;
      }
      recorder = controller;
      primary.disabled = false;
      setRecordingState(true);
      interval = setInterval(() => {
        timer.textContent = formatMediaDuration(controller.elapsed());
      }, 250);
    } catch (error: unknown) {
      primary.disabled = false;
      status.textContent =
        error instanceof MicPermissionError
          ? 'Permissão de microfone negada.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a gravação.';
    }
  };

  const stopAndSave = async (): Promise<void> => {
    if (!recorder || saving) return;
    saving = true;
    stopTimer();
    primary.disabled = true;
    cancel.disabled = true;
    close.disabled = true;
    status.textContent = 'Salvando áudio…';
    const active = recorder;
    recorder = null;
    try {
      const recorded = await active.stop();
      const saved = await options.onSave(recorded);
      if (saved) {
        settle(true);
        return;
      }
      status.textContent = 'Não foi possível salvar o áudio. Grave novamente.';
    } catch (error: unknown) {
      status.textContent =
        error instanceof RecordingCancelledError
          ? 'Gravação cancelada.'
          : 'Não foi possível salvar o áudio.';
    } finally {
      saving = false;
      primary.disabled = false;
      cancel.disabled = false;
      close.disabled = false;
      primaryLabel.textContent = 'Iniciar gravação';
      if (primaryIcon) primaryIcon.textContent = 'mic';
      timer.textContent = '00:00';
    }
  };

  primary.addEventListener('click', () => {
    if (recorder) void stopAndSave();
    else void start();
  });
  close.addEventListener('click', () => settle(false));
  cancel.addEventListener('click', () => settle(false));

  destroyDialog = mountDialog(backdrop, dialog, () => settle(false), {
    canClose: () => !saving,
  });
  return result;
}
