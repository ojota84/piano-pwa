# AGENTS.md / GEMINI.md - Piano Learning & Sight-Reading PWA

## 1. Project Vision & Context
* **Goal**: A Progressive Web Application (PWA) to teach piano sight-reading and music theory by listening to real acoustic piano playing via the microphone and providing instant visual feedback on musical partitions.
* **Target User**: Piano learner seeking to bridge sheet music notation (Fixed-Do Solfège) with physical keyboard execution directly on their smartphone placed on the piano desk.
* **Development Flow**: TDD (Test-Driven Development) using Red-Green-Refactor, OpenSpec for formal specifications, and Vitest for TypeScript unit testing.

---

## 2. Technical Agreements & Architecture

### A. Language & Platform
* **Platform**: Progressive Web App (PWA) targeting mobile browsers (Android Chrome, iOS Safari) and desktop.
* **Language**: **TypeScript** (Strict mode).
* **Testing Framework**: **Vitest** (`npm test`).
* **Core Philosophy**: Clean Architecture separating the core musical DSP/logic from the React UI.
  * **Core Domain Module (`src/lib/domain/`)**:
    * Pitch Detection DSP (Normalized Autocorrelation & Parabolic Peak Interpolation).
    * Musical Notation & Theory models (Fixed-Do Solfège: `Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`).
    * Exercise Engine ("Wait For Me" note matcher with 500ms acoustic refractory lockout & 2-frame noise confirmation).
    * *Zero UI / DOM dependencies in the domain module* allows 100% fast, isolated unit testing via Vitest.
  * **Presentation / UI Layer (`src/components/`, `src/App.tsx`)**:
    * Web Audio API `AudioContext` & `MediaStream` capturing raw microphone audio.
    * SVG Pentagram Staff with exact diatonic coordinates for Solfège notes.
    * Real-time microphone VU-meter and diagnostics panel.

### B. Audio DSP & Pitch Detection Agreement
* **Acoustic Strategy**: Monophonic fundamental frequency ($f_0$) extraction via normalized autocorrelation with sub-sample peak interpolation.
* **Pitch Range**: C2 (~65.4 Hz) to C6 (~1046.5 Hz) covering beginner-to-intermediate piano partition drills.
* **Acoustic Anti-Feedback Rule**: Mute all speaker playback during live microphone listening to prevent Larsen acoustic feedback loops.
* **Acoustic Refractory Period**: Enforce minimum 500ms lockout to ignore long-decaying piano string resonance from previous key strikes.
* **Noise Filtering**: 60Hz high-pass filter and 2-frame consecutive agreement to reject ambient clicks.

### C. Evaluation Mode
* **Mode**: **"Wait For Me" (Pitch-Targeted Sight-Reading)**.
* **Mechanism**: The partition cursor remains on the current target note until the listener detects the matching pitch. Once matched, it triggers feedback (visual highlight) and advances to the next note.
* **No Timing Penalties in v1**: Eliminates latency and rhythm frustration during early sight-reading practice.

---

## 3. Development Workflow (TDD & OpenSpec)

1. **Step 1: OpenSpec**: Formalize requirements and interfaces in `/openspec/`.
2. **Step 2: RED Tests**: Write failing Vitest tests (`src/lib/domain/*.test.ts`) specifying expected behavior.
3. **Step 3: Verification**: Run `npm test` and verify that the tests fail as expected.
4. **Step 4: GREEN Implementation**: Implement minimal TypeScript code to pass tests.
5. **Step 5: REFACTOR**: Clean up, optimize DSP, and document.
