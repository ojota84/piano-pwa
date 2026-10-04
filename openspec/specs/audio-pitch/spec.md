# Capability Specification: Acoustic Pitch Detection (Solfège)

## Requirement: Audio Buffer Pitch Extraction
The system MUST analyze raw PCM audio buffers (`Float32Array`) via `detectPitchFromBuffer` (`src/core/dsp/pitchDetector.ts`) and extract the monophonic fundamental frequency ($f_0$), mapping it to an immutable Fixed-Do Solfège `PitchResult`.

### Scenario: Rejection of Ambient Room Silence
* **GIVEN** an audio buffer where root-mean-square (RMS) energy is below the silence threshold (`< 0.0045`)
* **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
* **THEN** the returned `result.isPitched` MUST be `false`
* **AND** `result.solfegeName` MUST be `""`
* **AND** `Object.isFrozen(result)` MUST be `true`.

### Scenario: Detection of Middle Do (Do 4 / 261.63 Hz)
* **GIVEN** an audio buffer containing a `261.63 Hz` acoustic piano waveform at `44100 Hz`
* **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
* **THEN** `result.isPitched` MUST be `true`
* **AND** `result.solfegeName` MUST equal `"Do"`
* **AND** `result.octave` MUST equal `4`
* **AND** `result.midi` MUST equal `60`.

### Scenario: Detection of La 4 (440 Hz Tuning Pitch)
* **GIVEN** an audio buffer containing a `440.0 Hz` acoustic piano waveform at `44100 Hz`
* **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
* **THEN** `result.isPitched` MUST be `true`
* **AND** `result.solfegeName` MUST equal `"La"`
* **AND** `result.octave` MUST equal `4`
* **AND** `result.midi` MUST equal `69`.

## Requirement: Overtone & Subharmonic Disambiguation
The pitch detector MUST use McLeod First Prominent Peak selection (`>= max(0.55, 0.62 * maxOverallCorr)`) with 2nd-harmonic verification (`2 * lag`) so piano string overtones never jump an octave higher (+12 semitones) or drop an octave lower (-12 semitones).

### Scenario: Fundamental Extraction in the Presence of Strong Harmonics
* **GIVEN** a synthetic piano tone for `Do 4` (`261.63 Hz` fundamental + `523.25 Hz` 2nd harmonic + `784.88 Hz` 3rd harmonic)
* **WHEN** `detectPitchFromBuffer(buffer, 44100)` is executed
* **THEN** `result.midi` MUST equal `60` (`Do 4`)
* **AND** `result.midi` MUST NOT equal `72` (`Do 5`) or `48` (`Do 3`).
