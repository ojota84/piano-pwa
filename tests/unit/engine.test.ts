import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PracticeEngine,
  createInitialPracticeState,
  isSameOrNaturalHarmonic,
  evaluateRhythmTiming,
  computeGradeLabel,
} from '../../src/core/engine/PracticeEngine.ts';
import { PartitionPiece } from '../../src/core/models/music.types.ts';
import { PitchResult } from '../../src/core/models/pitch.types.ts';

describe('PracticeEngine Unit Tests (Core Domain & Immutability)', () => {
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

  it('should create frozen initial states and support pure domain helper functions', () => {
    const defaultState = createInitialPracticeState();
    expect(Object.isFrozen(defaultState)).toBe(true);
    expect(Object.isFrozen(defaultState.noteRecords)).toBe(true);
    expect(defaultState.partition).toBeNull();
    expect(defaultState.tempoBpm).toBe(75);

    const uninitializedEngine = new PracticeEngine();
    expect(uninitializedEngine.getTotalNotes()).toBe(0);
    expect(uninitializedEngine.isCompleted()).toBe(false);
    expect(uninitializedEngine.getCurrentTargetNote()).toBeNull();
    expect(uninitializedEngine.getExpectedNextNoteIntervalMs()).toBe(0);
    expect(uninitializedEngine.processDetectedPitch(null).status).toBe('IGNORED');

    // Pure harmonic overtone detector (0, +12, +19, +24 semitones)
    expect(isSameOrNaturalHarmonic(60, 60)).toBe(true);
    expect(isSameOrNaturalHarmonic(60, 72)).toBe(true);
    expect(isSameOrNaturalHarmonic(60, 79)).toBe(true);
    expect(isSameOrNaturalHarmonic(60, 84)).toBe(true);
    expect(isSameOrNaturalHarmonic(60, 48)).toBe(false);
    expect(isSameOrNaturalHarmonic(60, 62)).toBe(false);
    expect(isSameOrNaturalHarmonic(60, 71)).toBe(false);
    expect(isSameOrNaturalHarmonic(60, 78)).toBe(false);
    expect(isSameOrNaturalHarmonic(60, 80)).toBe(false);
    expect(isSameOrNaturalHarmonic(60, 83)).toBe(false);
    expect(isSameOrNaturalHarmonic(60, 85)).toBe(false);

    // Pure rhythm timing evaluator with exact tolerance boundaries
    // For expected = 1000ms, tolerance = max(280, round(350)) = 350ms -> on_time is [650..1350]
    expect(evaluateRhythmTiming(1000, 649)).toBe('early');
    expect(evaluateRhythmTiming(1000, 650)).toBe('on_time');
    expect(evaluateRhythmTiming(1000, 1000)).toBe('on_time');
    expect(evaluateRhythmTiming(1000, 1350)).toBe('on_time');
    expect(evaluateRhythmTiming(1000, 1351)).toBe('late');

    // For expected = 500ms, tolerance = max(280, 175) = 280ms -> on_time is [220..780]
    expect(evaluateRhythmTiming(500, 219)).toBe('early');
    expect(evaluateRhythmTiming(500, 220)).toBe('on_time');
    expect(evaluateRhythmTiming(500, 780)).toBe('on_time');
    expect(evaluateRhythmTiming(500, 781)).toBe('late');

    // Pure grade label boundaries (90, 75, 60)
    expect(computeGradeLabel(100)).toBe('Excellent');
    expect(computeGradeLabel(90)).toBe('Excellent');
    expect(computeGradeLabel(89)).toBe('Très bien');
    expect(computeGradeLabel(75)).toBe('Très bien');
    expect(computeGradeLabel(74)).toBe('Bien');
    expect(computeGradeLabel(60)).toBe('Bien');
    expect(computeGradeLabel(59)).toBe('À retravailler');
    expect(computeGradeLabel(0)).toBe('À retravailler');
  });

  it('should initialize at index 0 targeting Do 4 and support tempo clamping', () => {
    expect(Object.isFrozen(engine.getState())).toBe(true);
    expect(engine.getCurrentIndex()).toBe(0);
    expect(engine.getCurrentTargetNote()?.solfegePitch).toBe('Do 4');
    expect(engine.getTotalNotes()).toBe(3);
    expect(engine.isCompleted()).toBe(false);
    expect(engine.getAccuracyPercentage()).toBe(100);
    expect(engine.getExpectedNextNoteIntervalMs()).toBe(0);
    expect(engine.getPartition()?.id).toBe('test-piece');

    engine.setTempoBpm(10);
    expect(engine.getTempoBpm()).toBe(30);
    engine.setTempoBpm(30);
    expect(engine.getTempoBpm()).toBe(30);
    engine.setTempoBpm(300);
    expect(engine.getTempoBpm()).toBe(220);
    engine.setTempoBpm(220);
    expect(engine.getTempoBpm()).toBe(220);
    engine.setTempoBpm(80);
    expect(engine.getTempoBpm()).toBe(80);
  });

  it('should require 2 consecutive frames with stable cents (<= 25 drift) before advancing', () => {
    const do4Pitch: PitchResult = {
      frequency: 261.63,
      solfegeName: 'Do',
      octave: 4,
      midi: 60,
      cents: 0,
      confidence: 0.68, // Exact MIN_CONFIDENCE boundary
      rms: 0.004,       // Exact MIN_RMS boundary
      isPitched: true,
    };

    // Frame 1: Stabilizing
    const eval1 = engine.processDetectedPitch(do4Pitch);
    expect(Object.isFrozen(eval1)).toBe(true);
    expect(eval1.status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(0);

    // Unstable cents drift (26 > 25 cents) resets to 1 consecutive frame
    const driftedDo4: PitchResult = { ...do4Pitch, cents: 26 };
    expect(engine.processDetectedPitch(driftedDo4).status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(0);

    // Exact 25 cents drift from 26 -> 1 is allowed (|1 - 26| === 25 <= 25) -> Confirmed hit!
    const eval2 = engine.processDetectedPitch({ ...do4Pitch, cents: 1 });
    expect(Object.isFrozen(eval2)).toBe(true);
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
    expect(Object.isFrozen(evalResult)).toBe(true);
    expect(evalResult.status).toBe('MISMATCH');
    expect(evalResult.targetNote?.solfegePitch).toBe('Do 4');
    expect(evalResult.detectedPitch?.midi).toBe(62);
    expect(engine.getCurrentIndex()).toBe(0);
    expect(engine.getTotalAttempts()).toBe(1);
    expect(engine.getCorrectAttempts()).toBe(0);
    expect(engine.getAccuracyPercentage()).toBe(0);
  });

  it('should enforce exact 500ms refractory lockout to prevent piano string resonance from double-triggering', () => {
    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    // Play Do 4 (2 frames)
    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    expect(engine.getCurrentIndex()).toBe(1);

    // At 499ms (< 500ms), next note is ignored
    vi.advanceTimersByTime(499);
    const immediate = engine.processDetectedPitch(re4);
    expect(immediate.status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(1);

    // At exactly 500ms (499 + 1), lockout expires and Ré 4 is accepted
    vi.advanceTimersByTime(1);
    engine.processDetectedPitch(re4);
    const valid = engine.processDetectedPitch(re4);
    expect(valid.status).toBe('MATCH');
    expect(engine.getCurrentIndex()).toBe(2);
  });

  it('should mark partition as complete and freeze endTimeMs when all notes are matched', () => {
    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const re4: PitchResult = { frequency: 293.66, solfegeName: 'Ré', octave: 4, midi: 62, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };
    const mi4: PitchResult = { frequency: 329.63, solfegeName: 'Mi', octave: 4, midi: 64, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    // Note 1: Do 4 at t = 0
    engine.processDetectedPitch(do4);
    engine.processDetectedPitch(do4);
    vi.advanceTimersByTime(1000);
    expect(engine.getElapsedTimeSeconds()).toBe(1);

    // Note 2: Ré 4 at t = 1000ms
    engine.processDetectedPitch(re4);
    engine.processDetectedPitch(re4);
    vi.advanceTimersByTime(1000);

    // Note 3: Mi 4 at t = 2000ms
    engine.processDetectedPitch(mi4);
    engine.processDetectedPitch(mi4);

    expect(engine.isCompleted()).toBe(true);
    expect(engine.getCurrentIndex()).toBe(3);
    expect(engine.getCurrentTargetNote()).toBeNull();
    expect(engine.getAccuracyPercentage()).toBe(100);
    expect(engine.getElapsedTimeSeconds()).toBe(2);

    // Advancing timer after completion should NOT increase elapsed time
    vi.advanceTimersByTime(5000);
    expect(engine.getElapsedTimeSeconds()).toBe(2);
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
    expect(engine.getCurrentIndex()).toBe(1);

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
      rms: 0.04,
      isPitched: true,
    };

    expect(engine.processDetectedPitch(decayingLa4).status).toBe('IGNORED');
    // Slight fluctuation below 1.35x (0.04 * 1.34 = 0.0536 < 0.054) is still ignored
    expect(engine.processDetectedPitch({ ...decayingLa5Harmonic, rms: 0.053 }).status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(1);
    expect(engine.isCompleted()).toBe(false);

    // 3. Genuine strike at >= 1.35x minRms (0.055 >= 0.04 * 1.35) re-articulates and matches!
    const genuineLa5Strike: PitchResult = {
      ...decayingLa5Harmonic,
      rms: 0.055,
    };
    engine.processDetectedPitch(genuineLa5Strike);
    const match2 = engine.processDetectedPitch(genuineLa5Strike);
    expect(match2.status).toBe('MATCH');
    expect(engine.isCompleted()).toBe(true);
  });

  it('should ignore null, unpitched, low-confidence (< 0.68), or low-RMS (< 0.004) ambient noise and reset consecutive count', () => {
    const do4: PitchResult = { frequency: 261.63, solfegeName: 'Do', octave: 4, midi: 60, cents: 0, confidence: 0.95, rms: 0.05, isPitched: true };

    // Frame 1 of Do 4 -> consecutiveTargetCount becomes 1
    engine.processDetectedPitch(do4);
    expect(engine.getState().consecutiveTargetCount).toBe(1);

    // Null frame resets consecutiveTargetCount to 0
    expect(engine.processDetectedPitch(null).status).toBe('IGNORED');
    expect(engine.getState().consecutiveTargetCount).toBe(0);

    // Unpitched frame
    expect(engine.processDetectedPitch({ ...do4, isPitched: false }).status).toBe('IGNORED');

    // Confidence just below 0.68 (0.679)
    expect(engine.processDetectedPitch({ ...do4, confidence: 0.679 }).status).toBe('IGNORED');

    // RMS just below 0.004 (0.0039)
    expect(engine.processDetectedPitch({ ...do4, rms: 0.0039 }).status).toBe('IGNORED');
    expect(engine.getCurrentIndex()).toBe(0);
  });

  it('should evaluate early, on_time, and late rhythm timing and compute frozen grade summaries', () => {
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
    expect(engine.getGradeSummary().overallScorePercent).toBe(100);

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
    expect(Object.isFrozen(records)).toBe(true);
    expect(records).toHaveLength(3);
    expect(records[0].rhythmStatus).toBe('on_time');
    expect(records[0].expectedIntervalMs).toBe(0);
    expect(records[0].actualIntervalMs).toBe(0);
    expect(records[1].rhythmStatus).toBe('early');
    expect(records[1].expectedIntervalMs).toBe(2000);
    expect(records[1].actualIntervalMs).toBe(600);
    expect(records[2].rhythmStatus).toBe('late');
    expect(records[2].pitchCorrectFirstTry).toBe(false);
    expect(records[2].wrongAttemptsOnNote).toBe(1);

    const grade = engine.getGradeSummary();
    expect(Object.isFrozen(grade)).toBe(true);
    expect(Object.isFrozen(grade.noteRecords)).toBe(true);
    expect(grade.totalNotes).toBe(3);
    expect(grade.correctPitchNotesCount).toBe(2); // 67%
    expect(grade.onTimeRhythmNotesCount).toBe(1);   // 33%
    expect(grade.pitchScorePercent).toBe(67);
    expect(grade.rhythmScorePercent).toBe(33);
    expect(grade.overallScorePercent).toBe(53);
    expect(grade.gradeLabel).toBe('À retravailler');
  });

  it('should compute Lecture mode grading (100% pitch weight) and handle empty partitions', () => {
    const emptyEngine = new PracticeEngine();
    const emptySummary = emptyEngine.getGradeSummary();
    expect(Object.isFrozen(emptySummary)).toBe(true);
    expect(emptySummary.totalNotes).toBe(0);
    expect(emptySummary.overallScorePercent).toBe(100);

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
    vi.advanceTimersByTime(3000);
    engine.processDetectedPitch(re4);
    engine.processDetectedPitch(re4);
    vi.advanceTimersByTime(3000);
    engine.processDetectedPitch(mi4);
    engine.processDetectedPitch(mi4);

    const summary = engine.getGradeSummary();
    expect(summary.pitchScorePercent).toBe(100);
    expect(summary.rhythmScorePercent).toBe(33);
    expect(summary.overallScorePercent).toBe(100);
    expect(summary.gradeLabel).toBe('Excellent');
  });
});
