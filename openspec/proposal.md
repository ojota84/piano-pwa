# Product Proposal — Cadence (`piano-pwa`)

## 1. Problem Statement
Learning to sight-read piano sheet music and connect staff notation directly to physical piano keys is a high-friction hurdle for learners. Traditional apps either rely on passive on-screen button tapping or require MIDI cables. **Cadence** bridges sheet music notation with real acoustic or digital piano playing via the smartphone microphone, giving immediate visual feedback in **Fixed-Do Solfège** (`Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si`).

---

## 2. Core Value Proposition
A Progressive Web App (PWA) designed to sit on a piano music desk (`Le Pupitre`) that:
1. **Renders Crisp SVG Sheet Music**: Displays single-staff partitions in **Clé de Sol** (Treble) and **Clé de Fa** (Bass) with exact diatonic coordinates, ledger lines, measure bar lines, and Fixed-Do Solfège labels.
2. **Listens to Real Acoustic Pianos**: Extracts monophonic fundamental frequency ($f_0$) in real time via normalized autocorrelation and McLeod First Prominent Peak selection.
3. **Supports Dual Pedagogical Modes**:
   - **Mode Lecture ("Wait For Me")**: Stress-free pitch decoding—the cursor waits on the target note until the student strikes the exact key on their piano.
   - **Mode Rythme (Beat Ring)**: Embeds an animated circular **Beat Ring** directly around the active notehead on the staff so the learner sees both the note pitch and the exact strike window (`JOUEZ !`) without looking away from the partition.
4. **34-Level Progressive Curriculum**: Guides the learner from *Débutant* (Middle Do landmarks) through *Intermédiaire* (full octaves, thirds, bass clef) to *Avancé* (wide ledger lines `La 3` to `Do 6` and classical repertoire).

---

## 3. Non-Negotiable Acoustic & Pedagogical Rules
- **Fixed-Do Solfège Everywhere**: Exclusively uses `Do`, `Ré`, `Mi`, `Fa`, `Sol`, `La`, `Si` across all domain models, UI components, and tests.
- **Silent Visual Feedback**: Zero speaker audio playback during live microphone listening to prevent acoustic Larsen feedback loops.
- **Harmonic & Resonance Protection**: Enforces a 500ms refractory lockout and natural overtone (+12, +19, +24 semitones) decay rejection so piano string resonance never triggers false advances.
