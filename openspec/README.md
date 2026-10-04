# OpenSpec Index — Cadence (`piano-pwa`)

This directory contains the formal specifications, architectural design, and verification traceability for **Cadence**, the Piano Sight-Reading & Solfège Progressive Web App.

---

## 1. Naming & Formatting Convention

1. **Top-Level Documents (`/openspec/`)**:
   - `README.md`: Specification index, conventions, and code-to-test traceability matrix.
   - `proposal.md`: Product vision, target user, and pedagogical scope.
   - `design.md`: Hexagonal (Ports & Adapters) & Functional/Immutable technical architecture.
   - `tasks.md`: Implementation & CI quality gate checklist.
2. **Capability Specifications (`/openspec/specs/NNN-kebab-case.spec.md`)**:
   - All domain and architectural specifications live inside `/openspec/specs/` using a 3-digit prefix (`001-`, `002-`, ...) and `.spec.md` extension.
   - Every `.spec.md` file follows the same 4-section template:
     1. **Metadata Header** (`Spec ID`, `Status`, `Domain Module`, `Test Suite`)
     2. **Overview & Domain Scope**
     3. **Immutable Contracts & Interfaces**
     4. **Requirements & Gherkin Scenarios (`GIVEN / WHEN / THEN`)**

---

## 2. Specification Traceability Matrix

| Spec ID | File | Source Module(s) | Automated Verification Suite |
| :--- | :--- | :--- | :--- |
| **SPEC-001** | [`specs/001-acoustic-pitch-detection.spec.md`](./specs/001-acoustic-pitch-detection.spec.md) | `src/core/dsp/pitchDetector.ts`<br>`src/infrastructure/audio/WebAudioPitchAdapter.ts` | `tests/unit/dsp.test.ts` |
| **SPEC-002** | [`specs/002-solfege-theory-and-staff.spec.md`](./specs/002-solfege-theory-and-staff.spec.md) | `src/core/theory/musicTheory.ts`<br>`src/presentation/components/StaffView.tsx` | `tests/unit/theory.test.ts` |
| **SPEC-003** | [`specs/003-practice-and-rhythm-engine.spec.md`](./specs/003-practice-and-rhythm-engine.spec.md) | `src/core/engine/PracticeEngine.ts`<br>`src/presentation/components/FocusTrainingView.tsx` | `tests/unit/engine.test.ts` |
| **SPEC-004** | [`specs/004-curriculum-and-session-journey.spec.md`](./specs/004-curriculum-and-session-journey.spec.md) | `src/core/engine/TrainingSessionCoordinator.ts`<br>`src/infrastructure/data/InMemoryPartitionRepository.ts` | `tests/unit/curriculum.test.ts`<br>`tests/unit/session.test.ts` |
| **SPEC-005** | [`specs/005-hexagonal-architecture-and-pwa.spec.md`](./specs/005-hexagonal-architecture-and-pwa.spec.md) | `src/core/ports/*`<br>`src/infrastructure/*`<br>`vite.config.ts` | `tests/architecture/architecture.test.ts` |
