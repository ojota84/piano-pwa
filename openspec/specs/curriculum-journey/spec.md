# Capability Specification: Progressive Curriculum & Session Journey

## Requirement: 20-Level Progressive Solfège & Full-Range Rhythm Curriculum
The partition repository (`src/infrastructure/data/InMemoryPartitionRepository.ts`) MUST provide 20 progressive lessons (`levelNumber` `1..20`) across `'Débutant'`, `'Intermédiaire'`, and `'Avancé'` in both **Clé de Sol** (`treble`) and **Clé de Fa** (`bass`), covering `'lecture'` (8 lessons) and `'rythme'` (12 lessons).

### Scenario: Curriculum Completeness & Sequential Ordering
* **GIVEN** `partitionRepository.getAllPartitions()`
* **WHEN** inspected by the curriculum test suite
* **THEN** it MUST contain 20 levels numbered `1` through `20`
* **AND** every note MUST define a valid Fixed-Do `solfegePitch`, `midi`, `step`, `octave`, and `duration` (`whole`, `half`, `quarter`, `eighth`).

### Scenario: Full Rhythm Range Lessons (Rondes, Blanches, Noires & Croches)
* **GIVEN** the Rhythm lessons (`mode === 'rythme'`) in `partitionRepository.getPartitionsByMode('rythme')`
* **WHEN** inspected across `'Débutant'`, `'Intermédiaire'`, and `'Avancé'`
* **THEN** each difficulty tier MUST include Rhythm lessons combining **Blanches** (`'half'`, 2t), **Noires** (`'quarter'`, 1t), **Rondes** (`'whole'`, 4t), and **Croches** (`'eighth'`, ½t)
* **AND** both `'treble'` (Clé de Sol) and `'bass'` (Clé de Fa) MUST include Rhythm lessons with mixed durations.

## Requirement: 2-Screen Session Coordination & Rejouer (`runId`) Reset
`TrainingSessionCoordinator` (`src/core/engine/TrainingSessionCoordinator.ts`) MUST manage transitions between `'hub'` (`CurriculumHub`) and `'training'` (`FocusTrainingView`), producing frozen `SessionSnapshot` objects.

### Scenario: Entering a Training Level from the Hub
* **GIVEN** `coordinator` initialized on `'hub'`
* **WHEN** `coordinator.startLevel(level)` is called and the user plays the 1st target note across 2 frames
* **THEN** `snapshot.activeScreen` MUST be `'training'`
* **AND** `snapshot.currentIndex` MUST advance from `0` to `1`
* **AND** `snapshot.hasPerformanceStarted` MUST be `true`.

### Scenario: Clean Stopwatch & RunId Reset on Rejouer
* **GIVEN** an active training session where the 1st note has already been matched (`hasPerformanceStarted === true`)
* **WHEN** `coordinator.resetLevel()` is called
* **THEN** `snapshot.runId` MUST increment by `+1`
* **AND** `snapshot.hasPerformanceStarted` MUST be `false`
* **AND** `snapshot.currentIndex` MUST be `0`
* **AND** `snapshot.elapsedSeconds` MUST be `0`.

## Requirement: End-of-Level Grading Banner & Hands-Free Next-Level Progression
When the final note of a level is matched (`isCompleted === true`), `FocusTrainingView` MUST display a non-blocking summary banner with per-note pitch and rhythm diagnostics, a `Rejouer` action, and a `Niveau suivant` action that can also be triggered by pressing `Enter`.

### Scenario: Completing a Level and Advancing to the Next Level
* **GIVEN** `isCompleted === true` and a valid `nextLevel` in sequence
* **WHEN** the learner clicks `Niveau suivant` or presses `Enter`
* **THEN** `resetLevel(nextLevel)` MUST initialize the next partition at `currentIndex === 0` with `hasPerformanceStarted === false` and `elapsedSeconds === 0`.
