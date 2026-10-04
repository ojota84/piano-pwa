# Implementation & Quality Gate Checklist (`tasks.md`)

## Phase 1: Hexagonal Core Domain & Pure DSP (`Completed`)
- [x] **1.1** Define immutable `readonly` domain models in `src/core/models/music.types.ts` and `src/core/models/pitch.types.ts`.
- [x] **1.2** Define core ports in `src/core/ports/` (`AudioPitchPort.ts`, `PartitionRepositoryPort.ts`, `ProgressRepositoryPort.ts`).
- [x] **1.3** Implement pure Fixed-Do Solfège & rhythm math in `src/core/theory/musicTheory.ts`.
- [x] **1.4** Extract pure McLeod autocorrelation pitch detector in `src/core/dsp/pitchDetector.ts`.
- [x] **1.5** Implement immutable `PracticeEngine` and `TrainingSessionCoordinator` in `src/core/engine/`.

## Phase 2: Infrastructure Adapters (`Completed`)
- [x] **2.1** Implement `WebAudioPitchAdapter.ts` with 60Hz high-pass filter and zero-allocation `Float32Array` buffers.
- [x] **2.2** Implement 34 progressive lessons (Levels 1–34) across *Débutant*, *Intermédiaire*, and *Avancé* in `InMemoryPartitionRepository.ts`.
- [x] **2.3** Implement `LocalStorageProgressRepository` in `src/infrastructure/storage/ProgressStorage.ts`.

## Phase 3: Presentation & Active-Note Beat Ring (`Completed`)
- [x] **3.1** Build minimalist single-line `CurriculumHub.tsx` with level tabs, Lecture/Rythme filters, and Clef filters.
- [x] **3.2** Build memoized `StaffView.tsx` with dynamic time signatures, measure bar lines, and embedded circular **Beat Ring** on the active notehead.
- [x] **3.3** Build `FocusTrainingView.tsx` with end-of-level grading (`Excellent`, `Très bien`, `Bien`, `À retravailler`) and next-level progression.

## Phase 4: PWA & Offline Support (`Completed`)
- [x] **4.1** Configure `VitePWA` in `vite.config.ts` with standalone manifest and Workbox asset/font caching.
- [x] **4.2** Provide brand SVG (`public/icon.svg`) and PNG icons (`180x180`, `192x192`, `512x512`, maskable `512x512`).
- [x] **4.3** Implement `usePWAInstall.ts`, `PWAInstallButton.tsx`, and `OfflineIndicator.tsx`.

## Phase 5: Automated Testing & CI Quality Gates (`Completed`)
- [x] **5.1** Typecheck job (`npm run typecheck` -> `tsc --noEmit`).
- [x] **5.2** Lint job (`npm run lint` -> `eslint .` with TypeScript & React Hooks rules).
- [x] **5.3** Unit & Architectural test job (`npm test` -> 43 Vitest tests across 6 suites).
- [x] **5.4** Mutation test job (`npm run test:mutation` -> Stryker Mutator >= 85% break threshold, >94% score achieved).
