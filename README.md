# Cadence — Piano Sight-Reading PWA

> **Acoustic Piano Sight-Reading & Pitch Recognition for Smartphone & Desktop**

[![CI Pipeline](https://github.com/ojota84/piano-pwa/actions/workflows/ci.yml/badge.svg)](https://github.com/ojota84/piano-pwa/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-brightgreen.svg)](https://vitest.dev/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38b2ac.svg)](https://tailwindcss.com/)

---

## 🎹 Overview

**Cadence** is a Progressive Web Application (PWA) designed to bridge traditional sheet music notation (**Fixed-Do Solfège**) with physical piano execution. 

Designed specifically for **adult piano learners**, Cadence runs directly on your smartphone (e.g., Samsung Galaxy S21 5G / Android 15 or iOS Safari) rested on the piano music desk. It listens to your **real acoustic piano** through the built-in microphone and provides instant, non-intrusive visual feedback on the musical staff.

---

## ✨ Key Features

* **Real-Time Acoustic Pitch Detection ($f_0$)**:
  * Extracts fundamental frequencies from C2 (~65.4 Hz) to C6 (~1046.5 Hz) covering beginner-to-intermediate piano drills.
  * Powered by Normalized Autocorrelation with sub-sample Parabolic Peak Interpolation.
  * Octave harmonic folding prevents harmonic overtones from misleading the pitch estimator.
* **"Wait For Me" Sight-Reading Engine**:
  * The partition cursor remains on the current target note until you find and strike the correct key on your piano.
  * No countdown timers or stressful speed penalties — designed for deliberate, stress-free reading practice.
* **Acoustic Anti-Feedback Rule**:
  * Mutes all speaker audio during live microphone listening to eliminate Larsen audio feedback loops.
* **500 ms Acoustic Refractory Lockout**:
  * Automatically ignores decaying piano string vibrations and sympathetic resonance to prevent double-triggering notes.
* **Adaptive Screen Wake Lock (`navigator.wakeLock`)**:
  * Automatically keeps your phone screen lit and active while practicing, so your hands never have to leave the piano keys.
* **Interactive SVG Grand Staff**:
  * Accurate diatonic coordinates for Clef de Sol (Treble) and Clef de Fa (Bass).
  * Ledger lines for notes above and below the staff (Middle C / Do 4).
* **Acoustic Tuner & Diagnostics**:
  * Live VU-meter, detected note display, frequency in Hertz, and cents offset indicator.

---

## 🎼 Repertoire & Exercises

1. **Guide du Do Central (Middle C Landmark)**: Focus on Do 4 and neighboring notes.
2. **Marche Diatonique (Do à Sol)**: 5-finger right-hand position (Do, Ré, Mi, Fa, Sol).
3. **Octave Complète (Do 4 - Do 5)**: Full treble diatonic scale practice.
4. **Clé de Fa — Registre Grave**: Left-hand bass clef fundamentals (Do 3 to Sol 3).
5. **Prélude Diatonique**: Combined grand staff coordination.
6. **Ode à la Joie (Beethoven)**: Classic theme sight-reading.
7. **Clair de Lune (Thème)**: Melodic contour practice.

---

## 🏛 Clean Architecture

The codebase enforces strict domain separation:

```text
src/
├── core/                         # PURE TYPESCRIPT DOMAIN (Zero UI / DOM dependencies)
│   ├── engine/                   # Practice state machine & refractory timer
│   ├── models/                   # Immutable types (Note, PartitionPiece, PitchResult)
│   ├── ports/                    # Port interfaces (AudioPitchPort, PartitionRepositoryPort)
│   └── theory/                   # Solfège mappings, frequencies & DSP autocorrelation
├── infrastructure/               # ADAPTERS (Browser & Web Audio APIs)
│   ├── audio/                    # WebAudioPitchAdapter, WebAudioSynthAdapter
│   └── data/                     # InMemoryPartitionRepository
└── presentation/                 # REACT UI LAYER
    ├── components/               # StaffView (SVG), AcousticTuner, AndroidSyncModal
    └── App.tsx                   # Main practice view & lifecycle
```

---

## 🚀 Getting Started

### Prerequisites
* Node.js 20 or higher
* npm or bun

### Installation
```bash
# Clone the repository
git clone https://github.com/ojota84/piano-pwa.git
cd piano-pwa

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests
Cadence includes 24 automated unit and architectural boundary tests:
```bash
npm test
```

### Type Checking & Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
```

---

## 📱 Mobile & PWA Usage (Galaxy S21 & Android 15)

1. Open **Google Chrome** on your mobile device.
2. Navigate to your deployed app URL.
3. Tap the Chrome menu (`⋮`) and select **"Add to Home screen"** / **"Install app"**.
4. Grant microphone access when prompted.
5. Place your phone horizontally or vertically on your piano music desk and click **"Démarrer l'écoute"**.

---

## 📄 License

MIT License. Designed with precision for musicians.
