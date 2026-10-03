# Proposal: Piano Sight-Reading & Acoustic Ear Trainer (Solfège Edition)

## Why
Learning to sight-read sheet music and connect staff notation directly to the physical piano keys is a high-friction hurdle for piano students. Conventional methods use passive flashcards or require manual tapping. This app bridges sheet music partitions with real acoustic piano execution by listening through the phone's microphone and giving immediate visual feedback in **Fixed Do Solfège** (`Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`).

## What
A Progressive Web App (PWA) designed to sit on a piano music desk that:
1. Displays single-line musical partitions with Solfège notation and exact diatonic staff rendering.
2. Listens to the user's real piano via the phone microphone using monophonic pitch detection.
3. Implements the **"Wait For Me"** loop: the visual cursor waits on the current target note until the student strikes the correct note on their piano, then turns emerald green and advances.
4. Uses pure **TypeScript** for the core domain and DSP logic (`src/lib/domain/`) with full test-driven development (TDD) via **Vitest**.
5. Can later be packaged as an Android native app once the mobile web PWA experience is completely dialed in.

## Impact Summary
* **Target User**: Piano learner practicing with a real acoustic or digital piano with their smartphone on the music desk.
* **Notation Standard**: Fixed Do Solfège (`Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`) across all displays, models, and tests.
* **Audio Scope**: Monophonic fundamental frequency ($f_0$) pitch detection ($C_2 \rightarrow C_6$).
* **Acoustic Rule**: Silent visual feedback during mic listening mode to eliminate Larsen audio feedback loop.
* **Rhythm Scope (MVP)**: "Wait For Me" mode with no timing pressure in Phase 1 to isolate spatial decoding.
