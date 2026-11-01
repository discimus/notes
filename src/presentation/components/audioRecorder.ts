export interface RecordedAudio {
  blob: Blob;
  mimeType: string;
  duration: number;
}

export interface AudioRecorderController {
  elapsed: () => number;
  stop: () => Promise<RecordedAudio>;
  cancel: () => void;
}

export class MicPermissionError extends Error {
  constructor() {
    super('Permissão de microfone negada.');
    this.name = 'MicPermissionError';
  }
}

export class RecordingCancelledError extends Error {
  constructor() {
    super('Gravação cancelada.');
    this.name = 'RecordingCancelledError';
  }
}

const TIMESLICE_MS = 250;
const WAV_SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 2048;
const SUPPORTED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
];

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof AudioContext !== 'undefined') return AudioContext;
  const webkit = (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return webkit ?? null;
}

function isAppleIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function pickMimeTypes(): string[] {
  if (typeof MediaRecorder === 'undefined') return [];
  return SUPPORTED_MIME_TYPES.filter((mimeType) => {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  });
}

export function extensionForAudioMime(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'webm';
}

async function requestMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Seu navegador não suporta gravação de áudio.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new MicPermissionError();
  }
}

export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

export function downsampleToRate(
  samples: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate <= targetRate) return samples;
  const ratio = sourceRate / targetRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j] ?? 0;
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

async function startWavRecording(): Promise<AudioRecorderController> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error('Seu navegador não suporta gravação de áudio.');

  const stream = await requestMicrophone();
  const context = new Ctor();
  if (context.state === 'suspended') await context.resume();

  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
  const silence = context.createGain();
  silence.gain.value = 0;
  const chunks: Float32Array[] = [];
  let totalSamples = 0;
  let finalized = false;
  let cancelled = false;
  let done: Promise<RecordedAudio> | null = null;

  processor.onaudioprocess = (event) => {
    const data = event.inputBuffer.getChannelData(0).slice();
    chunks.push(data);
    totalSamples += data.length;
  };

  source.connect(processor);
  processor.connect(silence);
  silence.connect(context.destination);

  const startedAt = Date.now();
  const cleanup = (): void => {
    source.disconnect();
    processor.disconnect();
    silence.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };

  const finish = (): Promise<RecordedAudio> => {
    if (done) return done;
    done = (async () => {
      if (cancelled) throw new RecordingCancelledError();
      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const wav = downsampleToRate(merged, context.sampleRate, WAV_SAMPLE_RATE);
      const blob = new Blob([encodeWav(wav, WAV_SAMPLE_RATE)], { type: 'audio/wav' });
      return {
        blob,
        mimeType: 'audio/wav',
        duration: wav.length / WAV_SAMPLE_RATE,
      };
    })();
    return done;
  };

  return {
    elapsed: () => (Date.now() - startedAt) / 1000,
    stop: () => {
      if (!finalized) {
        finalized = true;
        cleanup();
      }
      return finish();
    },
    cancel: () => {
      if (finalized) return;
      finalized = true;
      cancelled = true;
      cleanup();
      void finish().catch(() => undefined);
    },
  };
}

async function startMediaRecorderRecording(): Promise<AudioRecorderController> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Seu navegador não suporta gravação de áudio.');
  }

  const stream = await requestMicrophone();
  const candidates = [...pickMimeTypes(), ''];
  let recorder: MediaRecorder | null = null;

  for (const mimeType of candidates) {
    try {
      const attempt = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      if (attempt.state === 'inactive') attempt.start(TIMESLICE_MS);
      recorder = attempt;
      break;
    } catch {
      recorder = null;
    }
  }

  if (!recorder) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error('Não foi possível iniciar a gravação de áudio.');
  }

  const mimeType = recorder.mimeType || 'audio/webm';
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();
  let cancelled = false;
  let finished = false;

  const done = new Promise<RecordedAudio>((resolve, reject) => {
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('stop', () => {
      if (finished) return;
      finished = true;
      stream.getTracks().forEach((track) => track.stop());
      if (cancelled) {
        reject(new RecordingCancelledError());
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        reject(new Error('A gravação ficou vazia.'));
        return;
      }
      resolve({
        blob,
        mimeType: blob.type || mimeType,
        duration: (Date.now() - startedAt) / 1000,
      });
    });
    recorder.addEventListener('error', () => {
      if (finished) return;
      finished = true;
      stream.getTracks().forEach((track) => track.stop());
      reject(new Error('Erro ao gravar áudio.'));
    });
  });

  void done.catch(() => undefined);

  return {
    elapsed: () => (Date.now() - startedAt) / 1000,
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop();
      return done;
    },
    cancel: () => {
      if (finished) return;
      cancelled = true;
      if (recorder.state !== 'inactive') recorder.stop();
      void done.catch(() => undefined);
    },
  };
}

export async function startAudioRecording(): Promise<AudioRecorderController> {
  if (isAppleIOS()) {
    try {
      return await startWavRecording();
    } catch (error) {
      if (error instanceof MicPermissionError) throw error;
    }
  }
  return startMediaRecorderRecording();
}
