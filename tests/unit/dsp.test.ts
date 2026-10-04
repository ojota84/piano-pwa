import { describe, it, expect } from 'vitest';
import { WebAudioPitchAdapter } from '../../src/infrastructure/audio/WebAudioPitchAdapter.ts';

describe('Acoustic DSP Pitch Extraction Tests', () => {
  const adapter = new WebAudioPitchAdapter();
  const sampleRate = 44100;
  const bufferSize = 2048;

  function generateSineWave(freq: number, amplitude: number = 0.5): Float32Array {
    const buffer = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      buffer[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    return buffer;
  }

  function generatePianoHarmonicTone(fundFreq: number): Float32Array {
    const buffer = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      // Fundamental + 2nd harmonic (0.4) + 3rd harmonic (0.25)
      buffer[i] =
        0.5 * Math.sin((2 * Math.PI * fundFreq * i) / sampleRate) +
        0.3 * Math.sin((2 * Math.PI * 2 * fundFreq * i) / sampleRate) +
        0.15 * Math.sin((2 * Math.PI * 3 * fundFreq * i) / sampleRate);
    }
    return buffer;
  }

  it('should detect synthetic 440 Hz sine wave as La 4 (MIDI 69)', () => {
    const buffer = generateSineWave(440);
    const result = adapter.detectPitch(buffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('La');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(69);
    expect(Math.abs(result.frequency - 440)).toBeLessThan(2);
  });

  it('should detect synthetic 261.63 Hz sine wave as Do 4 (Middle C / MIDI 60)', () => {
    const buffer = generateSineWave(261.63);
    const result = adapter.detectPitch(buffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Do');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(60);
    expect(Math.abs(result.frequency - 261.63)).toBeLessThan(2);
  });

  it('should detect synthetic 293.66 Hz sine wave as Ré 4 (MIDI 62)', () => {
    const buffer = generateSineWave(293.66);
    const result = adapter.detectPitch(buffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Ré');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(62);
    expect(Math.abs(result.frequency - 293.66)).toBeLessThan(2);
  });

  it('should detect synthetic 329.63 Hz sine wave as Mi 4 (MIDI 64)', () => {
    const buffer = generateSineWave(329.63);
    const result = adapter.detectPitch(buffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Mi');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(64);
    expect(Math.abs(result.frequency - 329.63)).toBeLessThan(2);
  });

  it('should detect fundamental Do 4 even in the presence of strong 2nd & 3rd harmonics', () => {
    const complexBuffer = generatePianoHarmonicTone(261.63);
    const result = adapter.detectPitch(complexBuffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Do');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(60);
  });

  it('should detect synthetic 392.00 Hz sine wave as Sol 4 (MIDI 67)', () => {
    const buffer = generateSineWave(392.0);
    const result = adapter.detectPitch(buffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Sol');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(67);
    expect(Math.abs(result.frequency - 392.0)).toBeLessThan(2);
  });

  it('should detect fundamental Sol 4 even in the presence of strong 2nd harmonic (784 Hz)', () => {
    const complexBuffer = generatePianoHarmonicTone(392.0);
    const result = adapter.detectPitch(complexBuffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Sol');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(67);
  });

  it('should detect synthetic 523.25 Hz sine wave as Do 5 (MIDI 72)', () => {
    const buffer = generateSineWave(523.25);
    const result = adapter.detectPitch(buffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Do');
    expect(result.octave).toBe(5);
    expect(result.midi).toBe(72);
    expect(Math.abs(result.frequency - 523.25)).toBeLessThan(3);
  });

  it('should accurately detect Do 4 (261.63 Hz) without octave-dropping to Do 3 even with decaying envelope and strong overtones', () => {
    const buffer = new Float32Array(bufferSize);
    const fundFreq = 261.63; // Do 4
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / 1200);
      buffer[i] =
        decay *
        (0.35 * Math.sin((2 * Math.PI * fundFreq * i) / sampleRate) +
          0.45 * Math.sin((2 * Math.PI * 2 * fundFreq * i) / sampleRate) +
          0.2 * Math.sin((2 * Math.PI * 3 * fundFreq * i) / sampleRate) +
          0.12 * Math.sin((2 * Math.PI * (fundFreq / 2) * i) / sampleRate));
    }
    const result = adapter.detectPitch(buffer, sampleRate, 'running');

    expect(result.isPitched).toBe(true);
    expect(result.solfegeName).toBe('Do');
    expect(result.octave).toBe(4);
    expect(result.midi).toBe(60);
  });

  it('should detect La 3 (220 Hz, MIDI 57) and Do 6 (1046.5 Hz, MIDI 84) at the extremes of the advanced Clé de Sol span', () => {
    const la3Buffer = generatePianoHarmonicTone(220.0);
    const la3Result = adapter.detectPitch(la3Buffer, sampleRate, 'running');
    expect(la3Result.isPitched).toBe(true);
    expect(la3Result.solfegeName).toBe('La');
    expect(la3Result.octave).toBe(3);
    expect(la3Result.midi).toBe(57);

    const do6Buffer = generateSineWave(1046.5);
    const do6Result = adapter.detectPitch(do6Buffer, sampleRate, 'running');
    expect(do6Result.isPitched).toBe(true);
    expect(do6Result.solfegeName).toBe('Do');
    expect(do6Result.octave).toBe(6);
    expect(do6Result.midi).toBe(84);
  });

  it('should reject pure silence as unpitched', () => {
    const silence = new Float32Array(bufferSize);
    const result = adapter.detectPitch(silence, sampleRate, 'running');

    expect(result.isPitched).toBe(false);
    expect(result.frequency).toBe(0);
  });
});
