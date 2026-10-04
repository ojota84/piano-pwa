import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrainingSessionCoordinator } from '../../src/core/engine/TrainingSessionCoordinator.ts';
import { PartitionPiece } from '../../src/core/models/music.types.ts';
import { PitchResult } from '../../src/core/models/pitch.types.ts';

describe('TrainingSessionCoordinator Unit Tests (Hub <-> Training & Live Pitch Evaluation)', () => {
  let level1Treble: PartitionPiece;
  let level5BassDo3: PartitionPiece;
  let coordinator: TrainingSessionCoordinator;

  const do3Pitch: PitchResult = {
    frequency: 130.81,
    solfegeName: 'Do',
    octave: 3,
    midi: 48,
    cents: 0,
    confidence: 0.94,
    rms: 0.04,
    isPitched: true,
  };

  const fa3Pitch: PitchResult = {
    frequency: 174.61,
    solfegeName: 'Fa',
    octave: 3,
    midi: 53,
    cents: 0,
    confidence: 0.92,
    rms: 0.04,
    isPitched: true,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    level1Treble = {
      id: 'level-1-landmarks-treble',
      category: 'landmarks',
      levelNumber: 1,
      title: 'Les Notes Repères : Do 4 & Sol 4',
      difficulty: 'Débutant',
      clef: 'treble',
      keySignature: 'Do',
      timeSignature: [4, 4],
      tempo: 60,
      description: 'Test Level 1',
      learningFocus: 'Do 4 & Sol 4',
      notes: [
        { id: '1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter', finger: 1 },
        { id: '2', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'quarter', finger: 5 },
      ],
    };

    level5BassDo3 = {
      id: 'level-5-bass-f3-c3',
      category: 'bass_clef',
      levelNumber: 5,
      title: 'Ancrage de la Clé de Fa : Fa 3 & Do 3',
      difficulty: 'Débutant',
      clef: 'bass',
      keySignature: 'Do',
      timeSignature: [4, 4],
      tempo: 65,
      description: 'Test Level 5 Bass Clef',
      learningFocus: 'Do 3 & Fa 3',
      notes: [
        { id: 'b1', solfegePitch: 'Do 3', midi: 48, step: 'Do', octave: 3, duration: 'quarter', finger: 5 },
        { id: 'b2', solfegePitch: 'Fa 3', midi: 53, step: 'Fa', octave: 3, duration: 'quarter', finger: 2 },
      ],
    };

    coordinator = new TrainingSessionCoordinator(level1Treble);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start on the hub screen and ignore note scoring until a training level is entered', () => {
    const initial = coordinator.getSnapshot();
    expect(initial.activeScreen).toBe('hub');
    expect(initial.currentIndex).toBe(0);
    expect(initial.justCompletedLevel).toBe(false);

    // Microphone hears Do 3 while still on Hub
    const result = coordinator.handlePitchDetected(do3Pitch);
    expect(result.evaluation.status).toBe('IGNORED');
    expect(result.snapshot.currentPitch?.solfegeName).toBe('Do');
    expect(result.snapshot.currentPitch?.octave).toBe(3);
    expect(result.snapshot.currentIndex).toBe(0);
    expect(result.snapshot.justCompletedLevel).toBe(false);

    // Supports returning to hub, clearing pitch, and setting tempo BPM
    const startSnap = coordinator.startLevel(level5BassDo3);
    expect(startSnap.justCompletedLevel).toBe(false);
    coordinator.handlePitchDetected(fa3Pitch); // trigger mismatch first
    expect(coordinator.getSnapshot().lastMismatch).toBe(true);

    const tempoSnap = coordinator.setTempoBpm(95);
    expect(tempoSnap.tempoBpm).toBe(95);
    expect(tempoSnap.justCompletedLevel).toBe(false);

    const clearSnap = coordinator.clearPitch();
    expect(clearSnap.currentPitch).toBeNull();
    expect(clearSnap.justCompletedLevel).toBe(false);

    expect(coordinator.getEngine().getTempoBpm()).toBe(95);

    const hubSnap = coordinator.backToHub();
    expect(hubSnap.activeScreen).toBe('hub');
    expect(hubSnap.lastMismatch).toBe(false);
    expect(hubSnap.justCompletedLevel).toBe(false);
  });

  it('should immediately evaluate Do 3 and advance pentagram when entering a training level from the Hub (regression test)', () => {
    const afterStart = coordinator.startLevel(level5BassDo3);
    expect(afterStart.activeScreen).toBe('training');
    expect(afterStart.selectedPiece.id).toBe('level-5-bass-f3-c3');
    expect(afterStart.currentIndex).toBe(0);

    const frame1 = coordinator.handlePitchDetected(do3Pitch);
    expect(frame1.snapshot.currentPitch?.solfegeName).toBe('Do');
    expect(frame1.snapshot.currentPitch?.octave).toBe(3);
    expect(frame1.evaluation.status).toBe('IGNORED');

    const frame2 = coordinator.handlePitchDetected(do3Pitch);
    expect(frame2.evaluation.status).toBe('MATCH');
    expect(frame2.snapshot.currentIndex).toBe(1);
    expect(frame2.snapshot.lastMismatch).toBe(false);
  });

  it('should flag wrong note as MISMATCH (red pentagram state) when playing Fa 3 instead of target Do 3 in training', () => {
    coordinator.startLevel(level5BassDo3);

    const wrongAttempt = coordinator.handlePitchDetected(fa3Pitch);
    expect(wrongAttempt.evaluation.status).toBe('MISMATCH');
    expect(wrongAttempt.snapshot.lastMismatch).toBe(true);
    expect(wrongAttempt.snapshot.currentIndex).toBe(0);
    expect(wrongAttempt.snapshot.accuracy).toBe(0);
  });

  it('should clear red mismatch state as soon as the correct target note Do 3 is matched', () => {
    coordinator.startLevel(level5BassDo3);

    coordinator.handlePitchDetected(fa3Pitch);
    expect(coordinator.getSnapshot().lastMismatch).toBe(true);

    coordinator.handlePitchDetected(do3Pitch);
    const matched = coordinator.handlePitchDetected(do3Pitch);
    expect(matched.evaluation.status).toBe('MATCH');
    expect(matched.snapshot.lastMismatch).toBe(false);
    expect(matched.snapshot.currentIndex).toBe(1);
  });

  it('should mark justCompletedLevel=true when the final note of a training level is matched', () => {
    coordinator.startLevel(level5BassDo3);

    // Match Note 1: Do 3
    coordinator.handlePitchDetected(do3Pitch);
    coordinator.handlePitchDetected(do3Pitch);
    expect(coordinator.getSnapshot().currentIndex).toBe(1);

    // Advance past 500ms refractory lockout
    vi.advanceTimersByTime(530);

    // Match Note 2: Fa 3
    coordinator.handlePitchDetected(fa3Pitch);
    const finalFrame = coordinator.handlePitchDetected(fa3Pitch);
    expect(finalFrame.evaluation.status).toBe('MATCH');
    expect(finalFrame.snapshot.isCompleted).toBe(true);
    expect(finalFrame.snapshot.justCompletedLevel).toBe(true);
  });

  it('should cleanly reset stopwatch and increment runId when Rejouer (resetLevel) is triggered', () => {
    const startSnap = coordinator.startLevel(level5BassDo3);
    const initialRunId = startSnap.runId;
    expect(startSnap.hasPerformanceStarted).toBe(false);

    // Play 1st note (Do 3) -> starts stopwatch & performance evaluation
    coordinator.handlePitchDetected(do3Pitch);
    const afterNote1 = coordinator.handlePitchDetected(do3Pitch);
    expect(afterNote1.snapshot.hasPerformanceStarted).toBe(true);
    expect(afterNote1.snapshot.lastMatchTimeMs).toBeGreaterThan(0);

    // Click Rejouer (resetLevel)
    const afterRejouer = coordinator.resetLevel();
    expect(afterRejouer.runId).toBe(initialRunId + 1);
    expect(afterRejouer.hasPerformanceStarted).toBe(false);
    expect(afterRejouer.currentIndex).toBe(0);
    expect(afterRejouer.elapsedSeconds).toBe(0);

    // Play 1st note again on the replayed run -> stopwatch starts fresh!
    coordinator.handlePitchDetected(do3Pitch);
    const replayNote1 = coordinator.handlePitchDetected(do3Pitch);
    expect(replayNote1.snapshot.hasPerformanceStarted).toBe(true);
    expect(replayNote1.snapshot.currentIndex).toBe(1);
    expect(replayNote1.snapshot.lastMatchTimeMs).toBeGreaterThan(0);
  });
});
