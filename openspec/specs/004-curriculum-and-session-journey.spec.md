# SPEC-004: 34-Level Curriculum & Training Session Coordinator

| Field | Value |
| :--- | :--- |
| **Spec ID** | `SPEC-004` |
| **Status** | `Implemented & Verified (100% Mutation Score)` |
| **Core Module** | `src/core/engine/TrainingSessionCoordinator.ts` |
| **Data Adapter** | `src/infrastructure/data/InMemoryPartitionRepository.ts` |
| **Test Suites** | `tests/unit/curriculum.test.ts`, `tests/unit/session.test.ts` |

---

## 1. Overview & Domain Scope
Coordinates the 2-screen user journey between the **Curriculum Hub** (`activeScreen === 'hub'`) and the **Focus Training View** (`activeScreen === 'training'`) across all **34 progressive Solfège & Rhythm lessons**, ensuring zero stale closures when switching levels or clicking **Rejouer**.

---

## 2. Immutable Contracts & Interfaces

```ts
export interface SessionSnapshot {
  readonly runId: number;
  readonly activeScreen: 'hub' | 'training';
  readonly selectedPiece: PartitionPiece;
  readonly currentIndex: number;
  readonly isCompleted: boolean;
  readonly hasPerformanceStarted: boolean;
  readonly lastMatchTimeMs: number;
  readonly expectedIntervalMs: number;
  readonly tempoBpm: number;
  readonly accuracy: number;
  readonly gradeSummary: Readonly<LevelGradeSummary>;
  readonly lastMismatch: boolean;
  readonly elapsedSeconds: number;
  readonly currentPitch: PitchResult | null;
  readonly justCompletedLevel: boolean;
}
```

---

## 3. Requirements & Gherkin Scenarios

### Requirement 4.1: 34-Level Progressive Curriculum Coverage
The repository MUST provide 34 progressive lessons (`levelNumber` `1..34`) spanning:
- **Difficulties**: `'Débutant'`, `'Intermédiaire'`, `'Avancé'`
- **Clefs**: `'treble'` (Clé de Sol, up to `La 3 – Do 6` with ledger lines) and `'bass'` (Clé de Fa, `Do 2 – Do 4`)
- **Modes**: `'lecture'` (pitch sight-reading) and `'rythme'` (pitch + tempo durations across `whole`, `half`, `quarter`, and `eighth` notes).

- **Scenario: Complete 34-Level Curriculum Validation**
  - **GIVEN** `partitionRepository.getAllPartitions()`
  - **WHEN** inspected by `tests/unit/curriculum.test.ts`
  - **THEN** it MUST contain 34 sequential levels (`1..34`) with valid MIDI/Solfège mappings across both clefs and all four note durations.

### Requirement 4.2: Hub-to-Training Transition & Rejouer (`runId`) Reset
The `TrainingSessionCoordinator` MUST ignore note scoring while on `'hub'`, immediately evaluate notes upon `startLevel(level)`, and increment `runId` while resetting `hasPerformanceStarted = false` and `elapsedSeconds = 0` whenever `resetLevel()` (**Rejouer**) is triggered.

- **Scenario: Clean Stopwatch & RunId Reset on Rejouer**
  - **GIVEN** an active training session where Note 1 has already been matched (`hasPerformanceStarted === true`)
  - **WHEN** `coordinator.resetLevel()` is invoked
  - **THEN** `snapshot.runId` MUST increment by `+1`
  - **AND** `snapshot.hasPerformanceStarted` MUST be `false`
  - **AND** `snapshot.currentIndex` MUST be `0`
  - **AND** `Object.isFrozen(snapshot)` MUST be `true`.
