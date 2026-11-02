import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeAudioContextFixture {
  Constructor: ReturnType<typeof vi.fn>;
  oscillators: Array<{
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    addEventListener: (event: string, callback: () => void) => void;
    end: () => void;
  }>;
  gainNodes: Array<{
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
  }>;
  resume: ReturnType<typeof vi.fn>;
}

function makeFakeAudioContext(initialState = 'running'): FakeAudioContextFixture {
  const oscillators: FakeAudioContextFixture['oscillators'] = [];
  const gainNodes: FakeAudioContextFixture['gainNodes'] = [];
  const resume = vi.fn(function (this: { state: string }) {
    this.state = 'running';
    return Promise.resolve();
  });

  const Constructor = vi.fn(function (this: {
    state: string;
    currentTime: number;
    destination: object;
    createOscillator: () => FakeAudioContextFixture['oscillators'][number];
    createGain: () => FakeAudioContextFixture['gainNodes'][number];
    resume: () => Promise<void>;
  }) {
    this.state = initialState;
    this.currentTime = 0;
    this.destination = {};
    this.createOscillator = () => {
      const endedListeners: Array<() => void> = [];
      const oscillator = {
        type: '',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: (event: string, callback: () => void) => {
          if (event === 'ended') endedListeners.push(callback);
        },
        end: () => {
          for (const callback of endedListeners) callback();
        },
      };
      oscillators.push(oscillator);
      return oscillator;
    };
    this.createGain = () => {
      const gainNode = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      };
      gainNodes.push(gainNode);
      return gainNode;
    };
    this.resume = () => resume.call(this);
  });

  return {
    Constructor,
    oscillators,
    gainNodes,
    resume,
  } as unknown as FakeAudioContextFixture;
}

async function loadCueModule() {
  return import('@presentation/components/audioCue.js');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('audio cue', () => {
  it('não falha quando Web Audio não está disponível', async () => {
    const { playEndCue, playRecordingStartCue, playStartCue } =
      await loadCueModule();

    expect(() => playStartCue()).not.toThrow();
    expect(() => playEndCue()).not.toThrow();
    expect(() => playRecordingStartCue()).not.toThrow();
  });

  it('sintetiza o beep de play e reutiliza o mesmo contexto', async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal('AudioContext', fixture.Constructor);
    const { playStartCue } = await loadCueModule();

    playStartCue();
    playStartCue();

    expect(fixture.Constructor).toHaveBeenCalledTimes(1);
    expect(fixture.oscillators).toHaveLength(2);
    expect(fixture.oscillators[0]?.type).toBe('sine');
    expect(fixture.oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(800, 0);
    expect(fixture.oscillators[0]?.connect).toHaveBeenCalledWith(fixture.gainNodes[0]);
    expect(fixture.gainNodes[0]?.connect).toHaveBeenCalledWith(expect.anything());
    expect(fixture.oscillators[0]?.start).toHaveBeenCalledTimes(1);
    expect(fixture.oscillators[0]?.stop.mock.calls[0]?.[0]).toBeCloseTo(0.11, 5);
  });

  it('sintetiza o beep de fim com frequência mais grave', async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal('AudioContext', fixture.Constructor);
    const { playEndCue } = await loadCueModule();

    playEndCue();

    expect(fixture.oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(620, 0);
    expect(fixture.oscillators[0]?.stop.mock.calls[0]?.[0]).toBeCloseTo(0.13, 5);
  });

  it('toca dois blips ascendentes ao iniciar a gravação', async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal('AudioContext', fixture.Constructor);
    const { playRecordingStartCue } = await loadCueModule();

    playRecordingStartCue();

    expect(fixture.oscillators).toHaveLength(2);
    expect(fixture.oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(988, 0);
    expect(fixture.oscillators[1]?.frequency.setValueAtTime).toHaveBeenCalledWith(1319, 0.08);
    expect(fixture.oscillators[1]?.start.mock.calls[0]?.[0]).toBeCloseTo(0.08, 5);
  });

  it('retoma contexto suspenso e desconecta os nós ao terminar', async () => {
    const fixture = makeFakeAudioContext('suspended');
    vi.stubGlobal('AudioContext', fixture.Constructor);
    const { playStartCue } = await loadCueModule();

    playStartCue();
    fixture.oscillators[0]?.end();

    expect(fixture.resume).toHaveBeenCalledTimes(1);
    expect(fixture.oscillators[0]?.disconnect).toHaveBeenCalledTimes(1);
    expect(fixture.gainNodes[0]?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('usa webkitAudioContext como fallback', async () => {
    const fixture = makeFakeAudioContext();
    vi.stubGlobal('webkitAudioContext', fixture.Constructor);
    const { playStartCue } = await loadCueModule();

    playStartCue();

    expect(fixture.Constructor).toHaveBeenCalledTimes(1);
    expect(fixture.oscillators[0]?.start).toHaveBeenCalled();
  });
});
