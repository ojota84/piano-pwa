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

## Requirement: Pre-Start Readiness & Zero Countdown Pressure on First Note
Before the learner strikes the 1st note of a lesson (`currentIndex === 0`, `hasPerformanceStarted === false`), the system MUST NOT run any countdown clock or flash the 1st note in a mismatch/timeout state.

### Scenario: Calm Pre-Start State on Note 1
* **GIVEN** a newly opened or reset Rhythm lesson at `currentIndex === 0` (`hasPerformanceStarted === false`)
* **WHEN** the learner is preparing at the piano before striking Note 1
* **THEN** Note 1 (`notes[0]`) MUST display a steady ready-to-strike cue (`▶ JOUEZ !`) with no running clock
* **AND** the stopwatch (`elapsedSeconds`) MUST remain at `0`
* **AND** Note 1 MUST always be graded `'on_time'` the moment it is struck.

## Requirement: Hold-Then-Play Rhythm Clock Ownership
In Rhythm mode (`mode === 'rythme'`), the visual progress ring MUST represent the **hold duration of the note that was just struck** (`notes[currentIndex - 1]`), never a countdown timer on an unplayed note.

### Scenario: Active Hold Clock Anchored on the Struck Note (`0.0 <= beatProgress < 1.0`)
* **GIVEN** the learner has just struck `notes[k]` (so `currentIndex === k + 1` and `0.0 <= beatProgress < 1.0`)
* **WHEN** the partition staff renders during `notes[k]`'s hold duration (`expectedIntervalMs`)
* **THEN** the filling hold ring (`Tenez ½t`, `Tenez 1t`, `Tenez 1/2 -> 2/2`, `Tenez 1/4 -> 4/4`) MUST be anchored on `notes[k]` (`index === currentIndex - 1`) and advance at `notes[k]`'s own beat duration
* **AND** the upcoming note `notes[k + 1]` (`index === currentIndex`) MUST display a static preview indicator (`Suivante`) with no running clock.

### Scenario: Strike Cue Transition When Hold Completes (`beatProgress >= 1.0`)
* **GIVEN** `notes[k]`'s hold duration has completed (`beatProgress >= 1.0`)
* **WHEN** the partition staff renders
* **THEN** `notes[k]` MUST be marked as completed (`✓`)
* **AND** the steady strike spotlight (`▶ JOUEZ !`) MUST move onto `notes[k + 1]` (`index === currentIndex`) with no running clock, signaling the learner to strike `notes[k + 1]` immediately.

## Requirement: Rhythm Timing & End-of-Level Grading
The stopwatch and rhythm evaluation MUST start only when the 1st note (`index 0`) is matched, classifying subsequent intervals as `'early'`, `'on_time'`, or `'late'` within tolerance `max(280, round(expectedIntervalMs * 0.35))`.

### Scenario: Lecture vs. Rythme Grading Summary
* **GIVEN** a completed level in `PracticeEngine`
* **WHEN** `engine.getGradeSummary()` is called
* **THEN** `'lecture'` mode MUST compute `overallScorePercent = pitchScorePercent` (`100%` weight)
* **AND** `'rythme'` mode MUST compute `overallScorePercent = round(pitchScorePercent * 0.6 + rhythmScorePercent * 0.4)`
* **AND** `gradeLabel` MUST map to `'Excellent'` (`>= 90%`), `'Très bien'` (`>= 75%`), `'Bien'` (`>= 60%`), or `'À retravailler'` (`< 60%`).
