import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PracticeEngine } from '../../src/core/engine/PracticeEngine.ts';
import { PartitionPiece } from '../../src/core/models/music.types.ts';
import { PitchResult } from '../../src/core/models/pitch.types.ts';

describe('PracticeEngine Unit Tests (Core Domain)', () => {
  let engine: PracticeEngine;
  let testPiece: PartitionPiece;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    engine = new PracticeEngine();

    testPiece = {
      id: 'test-piece',
      category: 'landmarks',
      mode: 'rythme',
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize at index 0 targeting Do 4 and support tempo clamping', () => {
    expect(engine.getCurrentIndex()).toBe(0);
    expect(engine.getCurrentTargetNote()?.solfegePitch).toBe('Do 4');
    expect(engine.getTotalNotes()).toBe(3);
    expect(engine.isCompleted()).toBe(false);
    expect(engine.getAccuracyPercentage()).toBe(100);
    expect(engine.getExpectedNextNoteIntervalMs()).toBe(0);
    expect(engine.getPartition()?.id).toBe('test-piece');

    engine.setTempoBpm(10);
    expect(engine.getTempoBpm()).toBe(30);
    engine.setTempoBpm(300);
    expect(engine.getTempoBpm()).toBe(220);
    engine.setTempoBpm(80);
    expect(engine.getTempoBpm()).toBe(80);
  });

  it('should require 2 consecutive frames with stable cents before advancing', () => {
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

    // Unstable cents drift (> 25 cents) resets to 1 consecutive frame
    const driftedDo4: PitchResult = { ...do4Pitch, cents: 35 };
    expect(engine.processDetectedPitch(driftedDo4).status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(0);

    // Frame 2 with stable cents: Confirmed hit
    const eval2 = engine.processDetectedPitch({ ...do4Pitch, cents: 30 });
    expect(eval2.status).toBe('MATCH');
    expect(engine.getCurrentIndex()).toBe(1);
    expect(engine.getCurrentTargetNote()?.solfegePitch).toBe('Ré 4');
    expect(engine.getExpectedNextNoteIntervalMs()).toBe(750);
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
    expect(engine.getTotalAttempts()).toBe(1);
    expect(engine.getCorrectAttempts()).toBe(0);
    expect(engine.getAccuracyPercentage()).toBe(0);
  });

  it('should enforce 500ms refractory lockout to prevent piano string resonance from double-triggering', () => {
    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    // Play Do 4 (2 frames)
    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    expect(engine.getCurrentIndex()).toBe(1);

    // Immediate next note within lockout period (< 500ms) should be ignored
    vi.advanceTimersByTime(499);
    const immediate = engine.processDetectedPitch(re4);
    expect(immediate.status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(1);

    // Advance past 500ms lockout
    vi.advanceTimersByTime(2);

    // Now Ré 4 is accepted (2 frames)
    engine.processDetectedPitch(re4);
    const valid = engine.processDetectedPitch(re4);
    expect(valid.status).toBe('MATCH');
    expect(engine.getCurrentIndex()).toBe(2);
  });

  it('should mark partition as complete when all notes are successfully matched', () => {
    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const mi4: PitchResult = { frequency: 329.63, solfegeName: 'Mi', octave: 4, midi: 64, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    // Note 1: Do 4
    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    vi.advanceTimersByTime(750);

    // Note 2: Ré 4
    engine.processDetectedPitch(re4);
    engine.processDetectedPitch(re4);
    vi.advanceTimersByTime(750);

    // Note 3: Mi 4
    engine.processDetectedPitch(mi4);
    engine.processDetectedPitch(mi4);

    expect(engine.isCompleted()).toBe(true);
    expect(engine.getCurrentIndex()).toBe(3);
    expect(engine.getCurrentTargetNote()).toBeNull();
    expect(engine.getAccuracyPercentage()).toBe(100);
    expect(engine.getElapsedTimeSeconds()).toBe(1);

    // Further pitches after completion are ignored
    expect(engine.processDetectedPitch(mi4).status).toBe('IGNORED');
  });

  it('should NOT turn La 5 green from the decaying harmonic of a previously played La 4 unless La 5 is genuinely struck', () => {
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

    // Advance past 500ms refractory lockout while the La 4 string is still decaying
    vi.advanceTimersByTime(550);

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

  it('should ignore null, unpitched, low-confidence, or low-RMS ambient noise', () => {
    expect(engine.processDetectedPitch(null).status).toBe('IGNORED');

    const unpitched: PitchResult = {
      frequency: 0,
      solfegeName: 'Do',
      octave: 4,
      midi: 60,
      cents: 0,
      confidence: 0.9,
      rms: 0.05,
      isPitched: false,
    };
    expect(engine.processDetectedPitch(unpitched).status).toBe('IGNORED');

    const lowConfidence: PitchResult = {
      frequency: 261.63,
      solfegeName: 'Do',
      octave: 4,
      midi: 60,
      cents: 0,
      confidence: 0.52, // Below 0.68 piano periodicity threshold
      rms: 0.01,
      isPitched: true,
    };
    expect(engine.processDetectedPitch(lowConfidence).status).toBe('IGNORED');

    const lowRms: PitchResult = {
      ...lowConfidence,
      confidence: 0.9,
      rms: 0.001, // Below 0.004 RMS threshold
    };
    expect(engine.processDetectedPitch(lowRms).status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(0);
  });

  it('should evaluate early, on_time, and late rhythm timing and compute grade labels', () => {
    // Use 60 BPM with a half note (2000ms expected, tolerance = 700ms -> on_time window is 1300ms..2700ms)
    const rhythmPiece: PartitionPiece = {
      ...testPiece,
      mode: 'rythme',
      tempo: 60,
      notes: [
        { id: '1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'half' },
        { id: '2', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter' },
        { id: '3', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter' },
      ],
    };
    engine.loadPartition(rhythmPiece);

    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const mi4: PitchResult = { frequency: 329.63, solfegeName: 'Mi', octave: 4, midi: 64, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const wrongFa4: PitchResult = { frequency: 349.23, solfegeName: 'Fa', octave: 4, midi: 65, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    expect(engine.hasPerformanceStarted()).toBe(false);
    expect(engine.getElapsedTimeSeconds()).toBe(0);

    // 1. Play Note 1 (Do 4, half note = 2000ms) -> starts evaluation, always on_time
    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    expect(engine.hasPerformanceStarted()).toBe(true);
    expect(engine.getLastMatchTimeMs()).toBeGreaterThan(0);

    // 2. Play Note 2 (Ré 4) after only 600ms (< 2000 - 700 = 1300ms) -> 'early'
    vi.advanceTimersByTime(600);
    engine.processDetectedPitch(re4);
    engine.processDetectedPitch(re4);

    // 3. Play Note 3 (Mi 4) after 1600ms (> 1000 + 350 = 1350ms) -> 'late', with a wrong note first
    vi.advanceTimersByTime(1600);
    engine.processDetectedPitch(wrongFa4);
    engine.processDetectedPitch(mi4);
    engine.processDetectedPitch(mi4);

    expect(engine.isCompleted()).toBe(true);
    const records = engine.getNoteRecords();
    expect(records).toHaveLength(3);
    expect(records[0].rhythmStatus).toBe('on_time');
    expect(records[1].rhythmStatus).toBe('early');
    expect(records[2].rhythmStatus).toBe('late');
    expect(records[2].pitchCorrectFirstTry).toBe(false);

    const grade = engine.getGradeSummary();
    expect(grade.totalNotes).toBe(3);
    expect(grade.correctPitchNotesCount).toBe(2); // 67%
    expect(grade.onTimeRhythmNotesCount).toBe(1);   // 33%
    expect(grade.pitchScorePercent).toBe(67);
    expect(grade.rhythmScorePercent).toBe(33);
    expect(grade.overallScorePercent).toBe(53); // 67 * 0.6 + 33 * 0.4 = 53.4 -> 53
    expect(grade.gradeLabel).toBe('À retravailler');
  });

  it('should compute Lecture mode grading (100% pitch weight) and handle empty partitions', () => {
    const emptyEngine = new PracticeEngine();
    expect(emptyEngine.getGradeSummary().overallScorePercent).toBe(100);

    const lecturePiece: PartitionPiece = {
      ...testPiece,
      mode: 'lecture',
    };
    engine.loadPartition(lecturePiece);

    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const mi4: PitchResult = { frequency: 329.63, solfegeName: 'Mi', octave: 4, midi: 64, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    vi.advanceTimersByTime(3000); // Even if slow in Lecture mode, overallScorePercent is 100% pitch!
    engine.processDetectedPitch(re4);
    engine.processDetectedPitch(re4);
    vi.advanceTimersByTime(3000);
    engine.processDetectedPitch(mi4);
    engine.processDetectedPitch(mi4);

    const summary = engine.getGradeSummary();
    expect(summary.pitchScorePercent).toBe(100);
    expect(summary.overallScorePercent).toBe(100);
    expect(summary.gradeLabel).toBe('Excellent');
  });
});
