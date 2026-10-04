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
      category: 'landmarks',
      levelNumber: 1,
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

  it('should NOT turn La 5 green from the decaying harmonic of a previously played La 4 unless La 5 is genuinely struck', async () => {
    const octavePiece: PartitionPiece = {
      ...testPiece,
      notes: [
        { id: 'a4', solfegePitch: 'La 4', midi: 69, step: 'La', octave: 4, duration: 'quarter' },
        { id: 'a5', solfegePitch: 'La 5', midi: 81, step: 'La', octave: 5, duration: 'quarter' },
      ],
    };
    engine.loadPartition(octavePiece);

    const la4Strike: PitchResult = {
      frequency: 440,
      solfegeName: 'La',
      octave: 4,
      midi: 69,
      cents: 0,
      confidence: 0.92,
      rms: 0.06,
      isPitched: true,
    };

    // 1. User plays La 4 -> matches Note 0 (La 4)
    engine.processDetectedPitch(la4Strike);
    const match1 = engine.processDetectedPitch(la4Strike);
    expect(match1.status).toBe('MATCH');
    expect(engine.getCurrentIndex()).toBe(1); // Now targeting La 5 (MIDI 81)

    // Wait past 500ms refractory lockout while the La 4 string is still decaying
    await new Promise((r) => setTimeout(r, 530));

    // 2. Decaying La 4 fundamental (MIDI 69) or decaying 2nd harmonic La 5 (MIDI 81) with lower/decaying RMS
    const decayingLa4: PitchResult = { ...la4Strike, rms: 0.04 };
    const decayingLa5Harmonic: PitchResult = {
      frequency: 880,
      solfegeName: 'La',
      octave: 5,
      midi: 81,
      cents: 0,
      confidence: 0.85,
      rms: 0.03,
      isPitched: true,
    };

    expect(engine.processDetectedPitch(decayingLa4).status).toBe('IGNORED');
    expect(engine.processDetectedPitch(decayingLa5Harmonic).status).toBe('IGNORED');
    expect(engine.processDetectedPitch(decayingLa5Harmonic).status).toBe('IGNORED');
    // Cursor must still be on La 5 (index 1), NOT completed!
    expect(engine.getCurrentIndex()).toBe(1);
    expect(engine.isCompleted()).toBe(false);

    // 3. Now user genuinely strikes La 5 (sharp RMS attack surge from 0.03 to 0.06)
    const genuineLa5Strike: PitchResult = {
      ...decayingLa5Harmonic,
      rms: 0.06,
    };
    engine.processDetectedPitch(genuineLa5Strike);
    const match2 = engine.processDetectedPitch(genuineLa5Strike);
    expect(match2.status).toBe('MATCH');
    expect(engine.isCompleted()).toBe(true);
  });

  it('should ignore low-confidence ambient room noise when nothing is played on the piano', () => {
    const ambientNoise: PitchResult = {
      frequency: 261.63,
      solfegeName: 'Do',
      octave: 4,
      midi: 60,
      cents: 0,
      confidence: 0.52, // Below 0.68 piano periodicity threshold
      rms: 0.01,
      isPitched: true,
    };

    expect(engine.processDetectedPitch(ambientNoise).status).toBe('IGNORED');
    expect(engine.processDetectedPitch(ambientNoise).status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(0);
  });
});
