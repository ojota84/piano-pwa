# Technical Design — Hexagonal & Functional Architecture

## 1. Layered Hexagonal Architecture (Ports & Adapters)

```text
+-----------------------------------------------------------------------+
|                       PRESENTATION LAYER (React 19)                   |
|  src/presentation/                                                    |
|  - App.tsx, CurriculumHub.tsx, FocusTrainingView.tsx                  |
|  - StaffView.tsx (Memoized SVG Pentagram & Active-Note Beat Ring)     |
|  - AcousticTuner.tsx, PWAInstallButton.tsx, OfflineIndicator.tsx      |
|  - hooks/useTrainingSession.ts, hooks/usePWAInstall.ts                |
+-----------------------------------+-----------------------------------+
                                    | depends inward on
                                    v
+-----------------------------------------------------------------------+
|                    CORE DOMAIN & PORTS (Pure TypeScript)              |
|  src/core/                                                            |
|  - models/  : Readonly interfaces (MusicalNote, PartitionPiece, etc.) |
|  - dsp/     : pitchDetector.ts (Pure McLeod Autocorrelation DSP)      |
|  - theory/  : musicTheory.ts (Diatonic staff math & rhythm beats)     |
|  - engine/  : PracticeEngine.ts & TrainingSessionCoordinator.ts       |
|  - ports/   : AudioPitchPort, PartitionRepositoryPort,                |
|               ProgressRepositoryPort                                  |
+-----------------------------------+-----------------------------------+
                                    ^ implemented by
                                    |
+-----------------------------------------------------------------------+
|                        INFRASTRUCTURE ADAPTERS                        |
|  src/infrastructure/                                                  |
|  - audio/   : WebAudioPitchAdapter.ts (Zero-alloc 60fps Web Audio)    |
|  - data/    : InMemoryPartitionRepository.ts (34 Solfège partitions)  |
|  - storage/ : LocalStorageProgressRepository (ProgressStorage.ts)     |
+-----------------------------------------------------------------------+
```

---

## 2. Core Engineering Principles

1. **Zero Platform Coupling in `src/core/`**:
   - `src/core/` never imports React, DOM APIs, `localStorage`, or Web Audio globals (`AudioContext`, `navigator.mediaDevices`).
   - Enforced automatically on every test run by `tests/architecture/architecture.test.ts`.
2. **Strict Immutability & Functional Programming**:
   - All domain interfaces and arrays use `readonly` modifiers and `Object.freeze(...)`.
   - Domain calculations use pure higher-order functions (`reduce`, `map`, `filter`, `find`, `Array.from`) and side-effect-free state transitions (`evaluatePitchTransition`, `computeGradeSummary`).
3. **Zero-Allocation Real-Time Audio Loop**:
   - `WebAudioPitchAdapter` pre-allocates reusable `Float32Array<ArrayBuffer>` buffers once per session and delegates pitch math to `detectPitchFromBuffer` in `src/core/dsp/pitchDetector.ts`.
4. **Mutation-Tested Domain Quality**:
   - Verified via **Vitest** unit/architecture tests and **Stryker Mutator** (`>94%` overall mutation score; `100%` on `musicTheory.ts` and `TrainingSessionCoordinator.ts`).
