# SPEC-002: Fixed-Do Solfège Theory, Rhythm Durations & Staff Geometry

| Field | Value |
| :--- | :--- |
| **Spec ID** | `SPEC-002` |
| **Status** | `Implemented & Verified (100% Mutation Score)` |
| **Core Module** | `src/core/theory/musicTheory.ts` |
| **UI Component** | `src/presentation/components/StaffView.tsx` |
| **Test Suite** | `tests/unit/theory.test.ts` |

---

## 1. Overview & Domain Scope
Defines the pure mathematical functions for Fixed-Do Solfège (`Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`), frequency-to-MIDI conversion, diatonic vertical staff coordinates in **Clé de Sol** (`treble`) and **Clé de Fa** (`bass`), note duration beat values (`whole`, `half`, `quarter`, `eighth`), and measure bar line placement.

---

## 2. Immutable Contracts & Interfaces

```ts
export const SOLFEGE_STEPS: readonly SolfegeStep[];
export const CHROMATIC_SOLFEGE: readonly string[];

export function getDiatonicStaffPosition(step: SolfegeStep, octave: number, clef: ClefType): number;
export function frequencyToMidiAndSolfege(frequency: number): Readonly<{
  midi: number;
  solfegeName: string;
  octave: number;
  cents: number;
}>;
export function getNoteDurationBeats(duration: NoteDuration): number;
export function getNoteDurationLabel(duration: NoteDuration): string;
export function getNoteTargetDurationMs(duration: NoteDuration, tempoBpm: number): number;
export function computeMeasureBarLineIndices(
  notes: readonly MusicalNote[],
  timeSignature?: readonly [number, number]
): readonly number[];
```

---

## 3. Requirements & Gherkin Scenarios

### Requirement 2.1: Diatonic Staff Position Calculation
Vertical staff coordinates MUST be calculated relative to the middle line (Line 3 = `0`):
- In **Clé de Sol (`treble`)**, Line 3 is `Si 4` (`rank 34`).
- In **Clé de Fa (`bass`)**, Line 3 is `Ré 3` (`rank 22`).

- **Scenario: Treble & Bass Landmark Coordinates**
  - **GIVEN** the pure function `getDiatonicStaffPosition(step, octave, clef)`
  - **WHEN** evaluated for `Do 4` in `treble` clef
  - **THEN** it MUST return `-6` (first ledger line below the treble staff)
  - **AND** `Si 4` in `treble` clef MUST return `0`
  - **AND** `Do 6` in `treble` clef MUST return `+8` (two ledger lines above the treble staff)
  - **AND** `Ré 3` in `bass` clef MUST return `0` (middle line of the bass staff).

### Requirement 2.2: Rhythm Duration Beats & Target Milliseconds
Each `NoteDuration` MUST map to its exact quarter-note beat count and French Solfège label:
- `'whole'` -> `4` beats (`"Ronde · 4 temps"`)
- `'half'` -> `2` beats (`"Blanche · 2 temps"`)
- `'quarter'` -> `1` beat (`"Noire · 1 temps"`)
- `'eighth'` -> `0.5` beats (`"Croche · ½ temps"`)

- **Scenario: Target Millisecond Calculation with Tempo Clamping**
  - **GIVEN** a `'half'` note (`2` beats) at `60 BPM`
  - **WHEN** `getNoteTargetDurationMs('half', 60)` is called
  - **THEN** it MUST return `2000` ms
  - **AND** tempos outside `[20..240]` BPM MUST be clamped to `[20..240]` BPM.

### Requirement 2.3: Pure Functional Measure Bar Line Placement
Vertical measure bar lines MUST be computed via a pure reduction over `notes.slice(0, -1)` based on `timeSignature` (`[4, 4]`, `[3, 4]`, `[6, 8]`), excluding the final note index.

- **Scenario: Measure Bar Lines in 4/4 and 3/4 Time Signatures**
  - **GIVEN** a 4/4 sequence of `[quarter, quarter, half, quarter, quarter, half]`
  - **WHEN** `computeMeasureBarLineIndices(notes, [4, 4])` is executed
  - **THEN** it MUST return a frozen array `[2]` (bar line after index 2).
