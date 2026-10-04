# SPEC-001: Acoustic Pitch Detection & McLeod Autocorrelation DSP

| Field | Value |
| :--- | :--- |
| **Spec ID** | `SPEC-001` |
| **Status** | `Implemented & Verified` |
| **Core Module** | `src/core/dsp/pitchDetector.ts` |
| **Adapter Module** | `src/infrastructure/audio/WebAudioPitchAdapter.ts` |
| **Test Suite** | `tests/unit/dsp.test.ts` |

---

## 1. Overview & Domain Scope
Extracts the monophonic fundamental frequency ($f_0$) from raw PCM time-domain audio buffers captured from an acoustic or digital piano (`62 Hz` to `1250 Hz`, covering `Do 2` through `Do 6` with headroom) and maps it to an immutable Fixed-Do Solfège `PitchResult`.

---

## 2. Immutable Contracts & Interfaces

```ts
export interface PitchDetectorConfig {
  readonly minFreq: number;             // Default: 62 Hz
  readonly maxFreq: number;             // Default: 1250 Hz
  readonly silenceThresholdRms: number; // Default: 0.0045
  readonly minConfidence: number;       // Default: 0.68
}

export function detectPitchFromBuffer(
  buffer: Float32Array,
  sampleRate: number,
  audioState?: string,
  config?: Readonly<PitchDetectorConfig>,
  reusableCorrBuffer?: Float32Array
): Readonly<PitchResult>;
```

---

## 3. Requirements & Gherkin Scenarios

### Requirement 1.1: Silence & Low-Energy Rejection
The DSP engine MUST reject buffers whose Root-Mean-Square (RMS) energy falls below `silenceThresholdRms` (`0.0045` by default).

- **Scenario: Rejection of Ambient Room Silence**
  - **GIVEN** a 2048-sample `Float32Array` buffer where RMS energy is `< 0.0045`
  - **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
  - **THEN** `result.isPitched` MUST be `false`
  - **AND** `result.solfegeName` MUST be `""`
  - **AND** `Object.isFrozen(result)` MUST be `true`.

### Requirement 1.2: Accurate Fundamental Extraction Across Treble & Bass Registers
The DSP engine MUST accurately extract the fundamental pitch and map it to Fixed-Do Solfège (`Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`) with sub-sample parabolic interpolation.

- **Scenario: Detection of Middle Do (`Do 4` / `261.63 Hz`)**
  - **GIVEN** a 2048-sample buffer containing a `261.63 Hz` waveform at `44100 Hz` sample rate
  - **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
  - **THEN** `result.isPitched` MUST be `true`
  - **AND** `result.solfegeName` MUST equal `"Do"`
  - **AND** `result.octave` MUST equal `4`
  - **AND** `result.midi` MUST equal `60`.

- **Scenario: Detection of Tuning Pitch (`La 4` / `440.0 Hz`)**
  - **GIVEN** a 2048-sample buffer containing a `440.0 Hz` waveform
  - **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
  - **THEN** `result.isPitched` MUST be `true`
  - **AND** `result.solfegeName` MUST equal `"La"`
  - **AND** `result.octave` MUST equal `4`
  - **AND** `result.midi` MUST equal `69`.

### Requirement 1.3: Overtone & Subharmonic Disambiguation (McLeod First Prominent Peak)
Acoustic piano strings produce strong 2nd and 3rd harmonics and decaying envelopes. The detector MUST select the first prominent peak (`>= max(0.55, 0.62 * maxOverallCorr)`) while verifying that `2 * lag` does not have a significantly stronger correlation (`> +0.12`), preventing both octave-jumping (+12 semitones) and subharmonic octave-dropping (-12 semitones).

- **Scenario: Fundamental Extraction in the Presence of Strong 2nd & 3rd Harmonics**
  - **GIVEN** a synthetic piano tone for `Do 4` (`261.63 Hz` fundamental + `523.25 Hz` 2nd harmonic + `784.88 Hz` 3rd harmonic)
  - **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
  - **THEN** `result.midi` MUST equal `60` (`Do 4`) and MUST NOT jump to `Do 5` (`72`) or drop to `Do 3` (`48`).
