export interface CueOptions {
  frequency?: number;
  durationMs?: number;
  volume?: number;
}

const DEFAULT_FREQUENCY = 800;
const DEFAULT_DURATION_MS = 110;
const DEFAULT_VOLUME = 0.18;

const DEFAULT_END_FREQUENCY = 620;
const DEFAULT_END_DURATION_MS = 130;
const DEFAULT_END_VOLUME = 0.16;

const DEFAULT_RECORD_FREQUENCY = 988;
const DEFAULT_RECORD_FREQUENCY_SECOND = 1319;
const DEFAULT_RECORD_DURATION_MS = 75;
const DEFAULT_RECORD_GAP_MS = 80;
const DEFAULT_RECORD_VOLUME = 0.16;

type AudioContextConstructor = new () => AudioContext;

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  const globalWithWebkit = globalThis as {
    webkitAudioContext?: AudioContextConstructor;
  };
  const Ctor: AudioContextConstructor | undefined =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : typeof globalWithWebkit.webkitAudioContext !== 'undefined'
        ? globalWithWebkit.webkitAudioContext
        : undefined;
  if (!Ctor) return null;
  sharedContext = new Ctor();
  return sharedContext;
}

export function playStartCue(options: CueOptions = {}): void {
  playTone(options);
}

export function playEndCue(options: CueOptions = {}): void {
  playTone({
    frequency: options.frequency ?? DEFAULT_END_FREQUENCY,
    durationMs: options.durationMs ?? DEFAULT_END_DURATION_MS,
    volume: options.volume ?? DEFAULT_END_VOLUME,
  });
}

export interface RecordingStartCueOptions extends CueOptions {
  frequencySecond?: number;
  gapMs?: number;
}

export function playRecordingStartCue(
  options: RecordingStartCueOptions = {}
): void {
  const frequency = options.frequency ?? DEFAULT_RECORD_FREQUENCY;
  const frequencySecond =
    options.frequencySecond ?? DEFAULT_RECORD_FREQUENCY_SECOND;
  const durationMs = options.durationMs ?? DEFAULT_RECORD_DURATION_MS;
  const gapMs = options.gapMs ?? DEFAULT_RECORD_GAP_MS;
  const volume = options.volume ?? DEFAULT_RECORD_VOLUME;

  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') void context.resume();

    const now = context.currentTime;
    playTone({
      frequency,
      durationMs,
      volume,
      startAt: now,
      context,
    });
    playTone({
      frequency: frequencySecond,
      durationMs,
      volume,
      startAt: now + gapMs / 1000,
      context,
    });
  } catch {
    // The cue must never break recording.
  }
}

interface ToneOptions extends CueOptions {
  startAt?: number;
  context?: AudioContext;
}

function playTone(options: ToneOptions = {}): void {
  const frequency = options.frequency ?? DEFAULT_FREQUENCY;
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
  const volume = options.volume ?? DEFAULT_VOLUME;

  try {
    const context = options.context ?? getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') void context.resume();

    const now = options.startAt ?? context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, volume),
      now + 0.004
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);

    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
    });
  } catch {
    // The cue must never break playback.
  }
}
