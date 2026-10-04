# Capability Specification: Progressive Curriculum & Session Journey

## Requirement: 34-Level Progressive Solfège & Rhythm Curriculum
The partition repository (`src/infrastructure/data/InMemoryPartitionRepository.ts`) MUST provide 34 progressive lessons (`levelNumber` `1..34`) across `'Débutant'`, `'Intermédiaire'`, and `'Avancé'` in both **Clé de Sol** (`treble`) and **Clé de Fa** (`bass`), covering `'lecture'` and `'rythme'` modes.

### Scenario: Curriculum Completeness & Sequential Ordering
* **GIVEN** `partitionRepository.getAllPartitions()`
* **WHEN** inspected by the curriculum test suite
* **THEN** it MUST contain 34 levels numbered `1` through `34`
* **AND** every note MUST define a valid Fixed-Do `solfegePitch`, `midi`, `step`, `octave`, and `duration` (`whole`, `half`, `quarter`, `eighth`).

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
