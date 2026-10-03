# Capability Specification: Acoustic Pitch Detection (Solfège)

## Requirement: Audio Buffer Pitch Extraction
The system MUST analyze raw PCM audio buffers and extract the fundamental frequency, mapping it to standard Solfège notes.

### Scenario: Rejection of Ambient Room Silence
* **GIVEN** an audio buffer where root-mean-square (RMS) energy is below the silence threshold (`< 0.01f`)
* **WHEN** `PitchDetector.detectPitch(buffer)` is executed
* **THEN** the returned `PitchResult.isPitched()` MUST be `false`
* **AND** `PitchResult.getSolfègeName()` MUST be empty.

### Scenario: Detection of Middle Do (Do 4 / 261.63 Hz)
* **GIVEN** an audio buffer containing a 261.63 Hz acoustic piano waveform
* **WHEN** `PitchDetector.detectPitch(buffer)` is executed
* **THEN** `PitchResult.isPitched()` MUST be `true`
* **AND** `PitchResult.getSolfègeName()` MUST equal `"Do"`
* **AND** `PitchResult.getOctave()` MUST equal `4`
* **AND** `PitchResult.getMidiNumber()` MUST equal `60`.

### Scenario: Detection of La 4 (440 Hz Tuning Pitch)
* **GIVEN** an audio buffer containing a 440.0 Hz acoustic piano waveform
* **WHEN** `PitchDetector.detectPitch(buffer)` is executed
* **THEN** `PitchResult.isPitched()` MUST be `true`
* **AND** `PitchResult.getSolfègeName()` MUST equal `"La"`
* **AND** `PitchResult.getOctave()` MUST equal `4`
* **AND** `PitchResult.getMidiNumber()` MUST equal `69`.
