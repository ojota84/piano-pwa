# SPEC-005: Hexagonal Architecture, Immutability, PWA & CI Gates

| Field | Value |
| :--- | :--- |
| **Spec ID** | `SPEC-005` |
| **Status** | `Implemented & Verified` |
| **Core Ports** | `src/core/ports/AudioPitchPort.ts`, `PartitionRepositoryPort.ts`, `ProgressRepositoryPort.ts` |
| **CI Workflow** | `.github/workflows/ci.yml`, `eslint.config.js`, `stryker.config.json` |
| **Test Suite** | `tests/architecture/architecture.test.ts` |

---

## 1. Overview & Domain Scope
Enforces the inward dependency rules of the Hexagonal Architecture (Ports & Adapters), compile-time and runtime immutability, Progressive Web App (PWA) installability/offline readiness, and the 5-job GitHub Actions CI pipeline.

---

## 2. Requirements & Gherkin Scenarios

### Requirement 5.1: Hexagonal Architectural Boundaries
1. **Rule 1 (Zero UI in Core)**: Files in `src/core/` MUST NOT import `react`, `react-dom`, `lucide-react`, or `canvas-confetti`.
2. **Rule 2 (Inward Dependencies Only)**: Files in `src/core/` MUST NOT import from `src/infrastructure/` or `src/presentation/`.
3. **Rule 3 (Zero Browser Globals in Core)**: Files in `src/core/` MUST NOT reference `AudioContext`, `webkitAudioContext`, `navigator.mediaDevices`, or `window.`.
4. **Rule 4 (Port Implementation)**:
   - `WebAudioPitchAdapter` MUST implement `AudioPitchPort` and delegate DSP to `detectPitchFromBuffer`.
   - `InMemoryPartitionRepository` MUST implement `PartitionRepositoryPort`.
   - `LocalStorageProgressRepository` MUST implement `ProgressRepositoryPort`.
5. **Rule 5 (Presentation Isolation)**: Components in `src/presentation/components/` MUST NOT contain raw autocorrelation DSP math or import `infrastructure/storage` directly.

- **Scenario: Automated Architectural Boundary Verification**
  - **GIVEN** all TypeScript source files under `src/core/`, `src/infrastructure/`, and `src/presentation/`
  - **WHEN** `tests/architecture/architecture.test.ts` executes
  - **THEN** all 5 architectural boundary rules MUST pass with zero violations.

### Requirement 5.2: Progressive Web App (PWA) Standalone & Offline Compliance
The application MUST be installable on Android, iOS Safari, and Desktop via `vite-plugin-pwa`, providing:
- A complete Web App Manifest (`id: '/'`, `short_name: 'Cadence'`, `display: 'standalone'`, `192x192`, `512x512`, and `maskable` icons).
- An in-app `<PWAInstallButton />` handling `beforeinstallprompt` and iOS Safari instructions.
- An `<OfflineIndicator />` notifying the user when practicing offline.

### Requirement 5.3: 5-Job GitHub Actions CI Quality Pipeline
Every push and pull request to `main` MUST pass 5 distinct jobs in `.github/workflows/ci.yml` using `actions/checkout@v7` and `actions/setup-node@v7` (Node 24):
1. `Typecheck (tsc)` -> `npm run typecheck` (`tsc --noEmit`)
2. `Lint (ESLint)` -> `npm run lint` (`eslint .`)
3. `Unit & Architecture Tests (Vitest)` -> `npm test` (`vitest run`)
4. `Mutation Testing (Stryker)` -> `npm run test:mutation` (`stryker run` with `>= 85%` break threshold)
5. `Production Build (Vite)` -> `npm run build` (`vite build`)
