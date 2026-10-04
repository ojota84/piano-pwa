import { PitchResult } from '../models/pitch.types.ts';
import { frequencyToMidiAndSolfege } from '../theory/musicTheory.ts';

export interface PitchDetectorConfig {
  readonly minFreq: number;
  readonly maxFreq: number;
  readonly silenceThresholdRms: number;
  readonly minConfidence: number;
}

export const DEFAULT_PITCH_DETECTOR_CONFIG: Readonly<PitchDetectorConfig> = Object.freeze({
  minFreq: 62,
  maxFreq: 1250,
  silenceThresholdRms: 0.0045,
  minConfidence: 0.68,
});

function createUnpitchedResult(
  rms: number,
  confidence: number,
  audioState: string,
  sampleRate: number,
  debugMessage: string
): Readonly<PitchResult> {
  return Object.freeze({
    frequency: 0,
    solfegeName: '',
    octave: 0,
    midi: 0,
    cents: 0,
    confidence,
    rms,
    isPitched: false,
    audioState,
    sampleRate,
    debugMessage,
  });
}

/**
 * Pure Core Domain DSP Function:
 * Monophonic Normalized Autocorrelation & McLeod Pitch Method (MPM) First Prominent Peak Picker
 * with harmonic/subharmonic verification and parabolic sub-sample peak interpolation.
 *
 * Zero DOM / Web Audio dependencies. Accepts an optional pre-allocated `reusableCorrBuffer`
 * to eliminate per-frame typed-array allocations at 60fps.
 */
export function detectPitchFromBuffer(
  buffer: Float32Array,
  sampleRate: number,
  audioState: string = 'running',
  config: Readonly<PitchDetectorConfig> = DEFAULT_PITCH_DETECTOR_CONFIG,
  reusableCorrBuffer?: Float32Array
): Readonly<PitchResult> {
  // 1. RMS Energy
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / buffer.length);

  if (rms < config.silenceThresholdRms) {
    return createUnpitchedResult(
      rms,
      0,
      audioState,
      sampleRate,
      `Silence (RMS ${rms.toFixed(4)} < seuil ${config.silenceThresholdRms.toFixed(4)})`
    );
  }

  // 2. Normalized Autocorrelation
  const minLag = Math.floor(sampleRate / config.maxFreq);
  const maxLag = Math.min(Math.ceil(sampleRate / config.minFreq), Math.floor(buffer.length / 2));
  const windowSize = Math.floor(buffer.length / 2);

  let energy0 = 0;
  for (let i = 0; i < windowSize; i++) {
    energy0 += buffer[i] * buffer[i];
  }

  if (energy0 < 1e-7) {
    return createUnpitchedResult(rms, 0, audioState, sampleRate, 'Énergie nulle');
  }

  const requiredCorrLength = maxLag + 2;
  const corr =
    reusableCorrBuffer && reusableCorrBuffer.length >= requiredCorrLength
      ? reusableCorrBuffer
      : new Float32Array(requiredCorrLength);

  let maxOverallCorr = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energyLag = 0;
    for (let i = 0; i < windowSize; i++) {
      sum += buffer[i] * buffer[i + lag];
      energyLag += buffer[i + lag] * buffer[i + lag];
    }
    const norm = Math.sqrt(energy0 * energyLag);
    const normalizedCorr = norm > 1e-7 ? sum / norm : 0;
    corr[lag] = normalizedCorr;

    if (normalizedCorr > maxOverallCorr) {
      maxOverallCorr = normalizedCorr;
    }
  }

  // Strict correlation confidence threshold so ambient noise is never mistaken for a piano note
  if (maxOverallCorr < config.minConfidence) {
    return createUnpitchedResult(
      rms,
      Math.max(0, maxOverallCorr),
      audioState,
      sampleRate,
      `Bruit ambiant (Confiance ${Math.round(maxOverallCorr * 100)}% < ${Math.round(
        config.minConfidence * 100
      )}%)`
    );
  }

  // 3. McLeod First Prominent Peak with 2nd-harmonic overtone verification
  const peakThreshold = Math.max(0.55, maxOverallCorr * 0.62);
  let bestLag = -1;

  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corr[lag] >= peakThreshold && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      const doubleLagCenter = lag * 2;
      let maxDoubleCorr = -1;
      if (doubleLagCenter <= maxLag) {
        const searchStart = Math.max(minLag, doubleLagCenter - 3);
        const searchEnd = Math.min(maxLag, doubleLagCenter + 3);
        for (let dLag = searchStart; dLag <= searchEnd; dLag++) {
          if (corr[dLag] > maxDoubleCorr) {
            maxDoubleCorr = corr[dLag];
          }
        }
      }

      if (maxDoubleCorr - corr[lag] > 0.12) {
        continue;
      }

      bestLag = lag;
      break;
    }
  }

  if (bestLag === -1) {
    return createUnpitchedResult(rms, maxOverallCorr, audioState, sampleRate, 'Aucun pic distinct');
  }

  // 4. Parabolic Peak Interpolation for sub-sample accuracy
  let refinedLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const alpha = corr[bestLag - 1];
    const beta = corr[bestLag];
    const gamma = corr[bestLag + 1];
    const denom = alpha - 2 * beta + gamma;
    if (Math.abs(denom) > 1e-8) {
      const delta = (alpha - gamma) / (2 * denom);
      refinedLag = bestLag + delta;
    }
  }

  const frequency = sampleRate / refinedLag;
  if (frequency < config.minFreq || frequency > config.maxFreq) {
    return createUnpitchedResult(
      rms,
      0,
      audioState,
      sampleRate,
      `Fréquence hors plage (${frequency.toFixed(1)} Hz)`
    );
  }

  // 5. Reuse pure MusicTheory frequency-to-MIDI & Fixed-Do Solfège mapper
  const { midi, solfegeName, octave, cents } = frequencyToMidiAndSolfege(frequency);
  const confidence = corr[bestLag];

  return Object.freeze({
    frequency,
    solfegeName,
    octave,
    midi,
    cents,
    confidence,
    rms,
    isPitched: true,
    audioState,
    sampleRate,
    debugMessage: `${solfegeName} ${octave} (${frequency.toFixed(1)} Hz) | Confiance ${Math.round(
      confidence * 100
    )}%`,
  });
}
