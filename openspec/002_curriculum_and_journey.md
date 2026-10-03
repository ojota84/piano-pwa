# OpenSpec 002: Progressive Curriculum & Focused Learning Journey

## 1. Context & Motivation
The current user experience combines level selection, practice view, and diagnostics on a single crowded screen. Furthermore, exercises are limited to basic diatonic drills. 
Adult piano learners need:
1. A **structured curriculum journey**: Enter the app, select a categorized training module based on skill level, and enter a dedicated, distraction-free **Pupitre (Music Desk) Focus Mode**.
2. **Progressive, musically rich levels**: Progressing from fundamental landmarks (Middle C) to intervals, bass clef mastery, and real classical repertoire themes.

---

## 2. User Journey Architecture

```text
[App Launch]
     │
     ▼
┌────────────────────────────────────────────────────────┐
│  SCREEN 1: CURRICULUM HUB (Catalogue des Niveaux)       │
│  - Categorized tracks (Repères, Clé de Fa, Intervalles, Morceaux)│
│  - Level cards: Title, Clef, Focus, Difficulty, Note count│
│  - Previous score / accuracy badge                     │
│  - "S'entraîner" CTA                                   │
└──────────────────────────┬─────────────────────────────┘
                           │ User selects level
                           ▼
┌────────────────────────────────────────────────────────┐
│  SCREEN 2: FOCUS PRACTICE (Le Pupitre)                 │
│  - Minimalist top bar: "← Niveaux", Title, Progress %  │
│  - Auto-centering Dynamic SVG Grand Staff               │
│  - Non-intrusive live acoustic tuner bar               │
│  - Instant visual feedback on piano pitch match         │
│  - Screen Wake Lock active (hands-free)                │
│  - End of level modal: Replay or "Niveau Suivant"      │
└────────────────────────────────────────────────────────┘
```

---

## 3. Curriculum Structure & Categories

### Category A: Les Repères Fondamentaux (Landmarks & 5-finger right hand)
* **A1: Le Do Central & ses voisins (Do 4, Ré 4)** — Beginner landmark.
* **A2: Tricorde Initial (Do - Ré - Mi)** — Step-wise motion, fingers 1-2-3.
* **A3: Le Pentacorde Complet (Do à Sol)** — 5-finger right-hand staple (Do 4 to Sol 4).
* **A4: La Quinte Pivot (Do 4 & Sol 4)** — Interval landmark drill (Do-Sol-Do-Sol).

### Category B: Clé de Fa & Registre Grave (Bass Clef Navigation)
* **B1: Ancrage de la Clé de Fa (Fa 3 & Do 3)** — Landmark lines of bass clef.
* **B2: Pentacorde Main Gauche (Do 3 - Ré 3 - Mi 3 - Fa 3 - Sol 3)** — Bass position.
* **B3: Arpèges & Accords Brisés de Basse (Do 3 - Mi 3 - Sol 3)** — Left hand harmony.

### Category C: Intervalles & Sauts Diatoniques (Intervals & Skips)
* **C1: L'Échelle Complète (Do 4 - Do 5)** — Full diatonic octave reading.
* **C2: Lecture en Tierces (Do-Mi, Ré-Fa, Mi-Sol, Fa-La)** — Line-to-line & space-to-space sight-reading.
* **C3: Sauts Mixtes (Quartes & Quintes)** — Reading wider spatial intervals without looking at hands.

### Category D: Morceaux Réels du Répertoire (Classical Themes)
* **D1: Hymne à la Joie (L. v. Beethoven)** — Celebrated theme in Do Majeur.
* **D2: Au Clair de la Lune (Mélodie Classique)** — Step-wise lyrical execution.
* **D3: Valse Favorite (Thème)** — Expressive 3/4 melodic contour.
* **D4: Prélude Diatonique** — Grand staff flow.

---

## 4. Technical Requirements & Domain Model
* Extend `PartitionPiece`:
  * `category`: `'landmarks' | 'bass_clef' | 'intervals' | 'repertoire'`
  * `order`: numeric sequencing for smooth progression
  * `estimatedDurationSec`: practice duration estimate
* Save progression / accuracy per level in `localStorage` for persistent motivation.
* Zero external UI dependencies in `src/core/`.
