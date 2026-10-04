# Capability Specification: "Wait For Me" & Rhythm Practice Engine

## Requirement: Interactive Progression on Acoustic Piano Match
The practice engine (`src/core/engine/PracticeEngine.ts`) MUST advance through the partition exclusively when two consecutive stable frames (`CONSECUTIVE_FRAMES_REQUIRED = 2`, cents drift `<= 25`) match the target MIDI note, enforcing a `500ms` refractory lockout (`REFRACTORY_LOCKOUT_MS = 500`) and natural harmonic decay rejection (`0, +12, +19, +24` semitones).

### Scenario: Correct Note Advance After 2 Consecutive Stable Frames
* **GIVEN** an active partition targeting `Do 4` (MIDI `60`) at index `0`
* **WHEN** the microphone detects `Do 4` across 2 consecutive stable frames
* **THEN** the evaluation `status` MUST be `'MATCH'`
* **AND** `engine.getCurrentIndex()` MUST advance to `1`.

### Scenario: Wrong Note Rejection (No Advance)
* **GIVEN** an active partition targeting `Do 4` (MIDI `60`) at index `0`
* **WHEN** the user strikes `Ré 4` (MIDI `62`) on the piano
* **THEN** the evaluation `status` MUST be `'MISMATCH'`
* **AND** `engine.getCurrentIndex()` MUST remain at `0` targeting `Do 4`.

### Scenario: Harmonic Decay Rejection Between Octave Notes
* **GIVEN** a partition targeting `La 4` (MIDI `69`) followed by `La 5` (MIDI `81`)
* **WHEN** `La 4` is matched and `550ms` elapses while the string decays into its 2nd harmonic (`La 5`) without a fresh hammer attack (`rms < minRmsSinceMatch * 1.35`)
* **THEN** the evaluation `status` MUST be `'IGNORED'`
* **AND** once `La 5` is genuinely struck (`rms >= minRmsSinceMatch * 1.35` for 2 frames), the evaluation `status` MUST be `'MATCH'`.

## Requirement: Rhythm Timing & End-of-Level Grading
The stopwatch and rhythm evaluation MUST start only when the 1st note (`index 0`) is matched, classifying subsequent intervals as `'early'`, `'on_time'`, or `'late'` within tolerance `max(280, round(expectedIntervalMs * 0.35))`.

### Scenario: Lecture vs. Rythme Grading Summary
* **GIVEN** a completed level in `PracticeEngine`
* **WHEN** `engine.getGradeSummary()` is called
* **THEN** `'lecture'` mode MUST compute `overallScorePercent = pitchScorePercent` (`100%` weight)
* **AND** `'rythme'` mode MUST compute `overallScorePercent = round(pitchScorePercent * 0.6 + rhythmScorePercent * 0.4)`
* **AND** `gradeLabel` MUST map to `'Excellent'` (`>= 90%`), `'Très bien'` (`>= 75%`), `'Bien'` (`>= 60%`), or `'À retravailler'` (`< 60%`).
