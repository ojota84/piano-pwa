# Implementation Tasks: Piano Sight-Reading PWA (Ports & Adapters)

## Phase 1: Ports & Adapters Refactoring (Completed)
- [x] 1.1 Create `src/core/models/` (`music.types.ts`, `pitch.types.ts`).
- [x] 1.2 Create `src/core/ports/` (`AudioPitchPort.ts`, `PartitionRepositoryPort.ts`).
- [x] 1.3 Create `src/core/theory/` (`musicTheory.ts` with diatonic coordinates and Fixed-Do Solfège).
- [x] 1.4 Create `src/core/engine/` (`PracticeEngine.ts` with 500ms refractory lockout and 2-frame noise confirmation).
- [x] 1.5 Create `src/infrastructure/audio/` (`WebAudioPitchAdapter.ts`, `WebAudioSynthAdapter.ts`).
- [x] 1.6 Create `src/infrastructure/data/` (`InMemoryPartitionRepository.ts`).
- [x] 1.7 Create `src/presentation/` (`components/`, `App.tsx`).
- [x] 1.8 Delete legacy `src/lib/` and `src/components/` folders.

## Phase 2: Vitest Automated Testing & Architecture Verification (Completed)
- [x] 2.1 `tests/architecture/architecture.test.ts`:
  - Rule 1: Core Domain never imports React, DOM, or UI packages.
  - Rule 2: Core Domain never imports Infrastructure or Presentation (inward dependencies only).
  - Rule 3: Core Domain contains zero browser/audio globals.
  - Rule 4: Infrastructure adapters implement their corresponding Core Ports.
  - Rule 5: Presentation layer contains zero raw DSP pitch algorithms.
- [x] 2.2 `tests/unit/engine.test.ts`: "Wait For Me" note matcher, lockout, and completion.
- [x] 2.3 `tests/unit/theory.test.ts`: Diatonic coordinate calculator and Solfège mapping.
- [x] 2.4 `tests/unit/dsp.test.ts`: Synthetic wave pitch extraction (440Hz A4, 261.63Hz C4, silence).
- [x] 2.5 All 21 tests passing green.
