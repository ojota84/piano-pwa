# SPEC-003: Sight-Reading & Rhythm Practice Engine

| Field | Value |
| :--- | :--- |
| **Spec ID** | `SPEC-003` |
| **Status** | `Implemented & Verified (>92% Mutation Score)` |
| **Core Module** | `src/core/engine/PracticeEngine.ts` |
| **UI Component** | `src/presentation/components/FocusTrainingView.tsx`, `src/presentation/components/StaffView.tsx` |
| **Test Suite** | `tests/unit/engine.test.ts` |

---

## 1. Overview & Domain Scope
Governs note-by-note evaluation, noise/harmonic filtering, stopwatch lifecycle, rhythmic inter-onset timing (`early`, `on_time`, `late`), and end-of-level grading across **Mode Lecture** (100% pitch accuracy) and **Mode Rythme** (60% pitch accuracy + 40% rhythm accuracy, guided by the circular **Beat Ring** around the active notehead).

---

## 2. Immutable Contracts & Interfaces

```ts
export function createInitialPracticeState(partition?: PartitionPiece | null): Readonly<PracticeEngineState>;
export function isSameOrNaturalHarmonic(fundamentalMidi: number, candidateMidi: number): boolean;
export function evaluateRhythmTiming(expectedIntervalMs: number, actualIntervalMs: number): RhythmStatus;
export function computeGradeLabel(scorePercent: number): GradeLabel;
export function computeGradeSummary(state: Readonly<PracticeEngineState>): Readonly<LevelGradeSummary>;
export function evaluatePitchTransition(
  state: Readonly<PracticeEngineState>,
  detectedPitch: PitchResult | null,
  nowMs: number
): Readonly<{ state: Readonly<PracticeEngineState>; evaluation: Readonly<EvaluationResult> }>;
```

---

## 3. Requirements & Gherkin Scenarios

### Requirement 3.1: 2-Frame Stability & 500ms Refractory Lockout
To prevent ambient room clicks and decaying piano strings from advancing the partition:
1. A pitch frame MUST have `confidence >= 0.68` and `rms >= 0.004`.
2. Two consecutive frames (`CONSECUTIVE_FRAMES_REQUIRED = 2`) matching `target.midi` with cents drift `<= 25` cents are required to confirm a `MATCH`.
3. A `500ms` refractory lockout (`REFRACTORY_LOCKOUT_MS = 500`) follows every `MATCH`.
4. Natural string harmonics (`0, +12, +19, +24` semitones) of the previously matched note are ignored until a key release or fresh hammer attack (`rms >= minRmsSinceMatch * 1.35`) occurs.

- **Scenario: 2-Frame Confirmation & Harmonic Decay Rejection**
  - **GIVEN** an active partition targeting `La 4` (MIDI 69) followed by `La 5` (MIDI 81)
  - **WHEN** `La 4` is matched on two consecutive frames and `550ms` elapses while the string decays into its 2nd harmonic (`La 5`, MIDI 81) without a fresh hammer attack
  - **THEN** `evaluatePitchTransition` MUST return `status: 'IGNORED'`
  - **AND** once `La 5` is genuinely struck (`rms >= minRmsSinceMatch * 1.35` across 2 stable frames), it MUST return `status: 'MATCH'`.

### Requirement 3.2: First-Note Stopwatch Trigger & Rhythm Timing Evaluation
The stopwatch and rhythmic interval evaluation MUST NOT start when the screen opens; they start exclusively when the **1st note** of the partition is matched (`currentIndex === 0`).
For every subsequent note (`currentIndex > 0`), `actualIntervalMs = nowMs - lastMatchTimeMs` is compared against `expectedIntervalMs` (the previous note's target duration at `tempoBpm`) with tolerance `max(280, round(expectedIntervalMs * 0.35))`.

- **Scenario: Early, On-Time, and Late Rhythm Classification**
  - **GIVEN** `expectedIntervalMs = 1000` ms (tolerance `= 350` ms, window `[650..1350]` ms)
  - **WHEN** `evaluateRhythmTiming(1000, actualIntervalMs)` is called
  - **THEN** `649` ms MUST return `'early'`, `650..1350` ms MUST return `'on_time'`, and `1351` ms MUST return `'late'`.

### Requirement 3.3: End-of-Level Grading Summary
- In **Mode Lecture** (`mode === 'lecture'`), `overallScorePercent` equals `pitchScorePercent` (`100%` weight).
- In **Mode Rythme** (`mode === 'rythme'`), `overallScorePercent = round(pitchScorePercent * 0.6 + rhythmScorePercent * 0.4)`.
- Grade labels map to: `>= 90%` -> `'Excellent'`, `>= 75%` -> `'Très bien'`, `>= 60%` -> `'Bien'`, `< 60%` -> `'À retravailler'`.
