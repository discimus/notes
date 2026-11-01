import { describe, expect, it } from 'vitest';
import {
  downsampleToRate,
  encodeWav,
  extensionForAudioMime,
} from '@presentation/components/audioRecorder.js';

describe('gravador de áudio', () => {
  it('codifica WAV mono 16-bit', () => {
    const samples = new Float32Array([0, 0.5, -0.5]);
    const buffer = encodeWav(samples, 16000);
    const view = new DataView(buffer);

    expect(String.fromCharCode(...new Uint8Array(buffer, 0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...new Uint8Array(buffer, 8, 4))).toBe('WAVE');
    expect(body(buffer)).toBe(44 + samples.length * 2);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
  });

  it('faz downsample preservando a taxa quando não é necessário', () => {
    const samples = new Float32Array([1, 2, 3, 4]);
    expect(downsampleToRate(samples, 16000, 16000)).toBe(samples);

    const reduced = downsampleToRate(samples, 32000, 16000);
    expect(reduced.length).toBe(2);
  });

  it('escolhe extensão pelo mime type', () => {
    expect(extensionForAudioMime('audio/wav')).toBe('wav');
    expect(extensionForAudioMime('audio/mp4')).toBe('mp4');
    expect(extensionForAudioMime('audio/webm;codecs=opus')).toBe('webm');
  });
});

function body(buffer: ArrayBuffer): number {
  return new DataView(buffer).getUint32(4, true) + 8;
}
