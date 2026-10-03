# Technical Design: Piano Sight-Reading PWA (TypeScript + Vitest)

## 1. System Architecture: Clean Architecture

```
+--------------------------------------------------------------+
|                    Presentation Layer (React)                |
|  - StaffView.tsx (SVG Pentagram with exact diatonic coords)   |
|  - AcousticTuner.tsx (VU-meter, sensitivity presets, mic)    |
|  - PianoKeyboard.tsx (Interactive keyboard & preview)        |
+------------------------------+-------------------------------+
                               | calls / receives state
                               v
+--------------------------------------------------------------+
|            Core Domain Engine (src/lib/domain/)             |
|  - practiceEngine.ts: "Wait For Me" state machine            |
|  - musicTheory.ts: Diatonic staff math & Solfège mapping     |
|  - types.ts: Pure interfaces (MusicalNote, PartitionPiece)   |
|  -> 100% Tested via Vitest (practiceEngine.test.ts, etc.)    |
+------------------------------+-------------------------------+
                               ^ feeds pitch results
                               |
+--------------------------------------------------------------+
|             Acoustic Audio Pipeline (Web Audio API)          |
|  - audioPitch.ts: Autocorrelation + 60Hz High-pass filter     |
|  - Microscopic latency (<40ms), strict 0.75 correlation      |
+--------------------------------------------------------------+
```

## 2. Audio Anti-Feedback & Noise Rejection
1. **Silent Visual Feedback**: All audio chimes are muted during microphone listening mode to prevent acoustic feedback (Larsen loop) with the phone speaker.
2. **60Hz High-Pass Filter**: Strips background room rumble, AC hum, and table vibrations.
3. **500ms Refractory Lockout**: Ignores prolonged piano string resonance from previous key strikes.
4. **2-Frame Consecutive Confirmation**: Filters out transient room clicks.
