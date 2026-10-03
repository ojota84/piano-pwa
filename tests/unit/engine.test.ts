import { describe, it, expect, beforeEach } from 'vitest';
import { PracticeEngine } from '../../src/core/engine/PracticeEngine.ts';
import { PartitionPiece } from '../../src/core/models/music.types.ts';
import { PitchResult } from '../../src/core/models/pitch.types.ts';

describe('PracticeEngine Unit Tests (Core Domain)', () => {
  let engine: PracticeEngine;
  let testPiece: PartitionPiece;

  beforeEach(() => {
    engine = new PracticeEngine();

    testPiece = {
      id: 'test-piece',
      title: 'Do-Ré-Mi Initiation',
      difficulty: 'Débutant',
      clef: 'treble',
      keySignature: 'Do',
      timeSignature: [4, 4],
      tempo: 80,
      description: 'Test piece',
      learningFocus: 'Do-Ré-Mi',
      notes: [
        { id: '1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter', finger: 1 },
        { id: '2', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter', finger: 2 },
        { id: '3', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
      ],
    };

    engine.loadPartition(testPiece);
  });

  it('should initialize at index 0 targeting Do 4', () => {
    expect(engine.getCurrentIndex()).toBe(0);
    expect(engine.getCurrentTargetNote()?.solfegePitch).toBe('Do 4');
    expect(engine.getTotalNotes()).toBe(3);
    expect(engine.isCompleted()).toBe(false);
  });

  it('should require 2 consecutive frames before advancing to eliminate transient noise', () => {
    const do4Pitch: PitchResult = {
      frequency: 261.63,
      solfegeName: 'Do',
      octave: 4,
      midi: 60,
      cents: 0,
      confidence: 0.95,
      rms: 0.05,
      isPitched: true,
    };

    // Frame 1: Stabilizing
    const eval1 = engine.processDetectedPitch(do4Pitch);
    expect(eval1.status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(0);

    // Frame 2: Confirmed hit
    const eval2 = engine.processDetectedPitch(do4Pitch);
    expect(eval2.status).toBe('MATCH');
    expect(engine.getCurrentIndex()).toBe(1);
    expect(engine.getCurrentTargetNote()?.solfegePitch).toBe('Ré 4');
  });

  it('should flag wrong note as MISMATCH and not advance cursor', () => {
    const wrongPitch: PitchResult = {
      frequency: 293.66,
      solfegeName: 'Ré',
      octave: 4,
      midi: 62,
      cents: 0,
      confidence: 0.9,
      rms: 0.05,
      isPitched: true,
    };

    const evalResult = engine.processDetectedPitch(wrongPitch);
    expect(evalResult.status).toBe('MISMATCH');
    expect(engine.getCurrentIndex()).toBe(0);
    expect(engine.getCurrentTargetNote()?.solfegePitch).toBe('Do 4');
  });

  it('should enforce 500ms refractory lockout to prevent piano string resonance from double-triggering', async () => {
    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    // Play Do 4 (2 frames)
    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    expect(engine.getCurrentIndex()).toBe(1);

    // Immediate next note within lockout period (< 500ms) should be ignored
    const immediate = engine.processDetectedPitch(re4);
    expect(immediate.status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(1);

    // Wait for lockout to expire
    await new Promise((resolve) => setTimeout(resolve, 550));

    // Now Ré 4 is accepted (2 frames)
    engine.processDetectedPitch(re4);
    const valid = engine.processDetectedPitch(re4);
    expect(valid.status).toBe('MATCH');
    expect(engine.getCurrentIndex()).toBe(2);
  });

  it('should mark partition as complete when all notes are successfully matched', async () => {
    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const mi4: PitchResult = { frequency: 329.63, solfegeName: 'Mi', octave: 4, midi: 64, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    // Note 1: Do 4
    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    await new Promise((r) => setTimeout(r, 520));

    // Note 2: Ré 4
    engine.processDetectedPitch(re4);
    engine.processDetectedPitch(re4);
    await new Promise((r) => setTimeout(r, 520));

    // Note 3: Mi 4
    engine.processDetectedPitch(mi4);
    engine.processDetectedPitch(mi4);

    expect(engine.isCompleted()).toBe(true);
    expect(engine.getCurrentIndex()).toBe(3);
    expect(engine.getAccuracyPercentage()).toBe(100);
  });
});
