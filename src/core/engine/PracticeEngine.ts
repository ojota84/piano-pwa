import {
  MusicalNote,
  PartitionPiece,
} from '../models/music.types.ts';
import {
  PitchResult,
  EvaluationResult,
  NotePerformanceRecord,
  LevelGradeSummary,
  RhythmStatus,
  GradeLabel,
} from '../models/pitch.types.ts';
import { getNoteTargetDurationMs } from '../theory/musicTheory.ts';

export const REFRACTORY_LOCKOUT_MS = 500;
export const MIN_CONFIDENCE = 0.68;
export const MIN_RMS = 0.004;
export const MAX_CENTS_DRIFT = 25;
export const CONSECUTIVE_FRAMES_REQUIRED = 2;

const HARMONIC_SEMITONE_OFFSETS: readonly number[] = Object.freeze([0, 12, 19, 24]);

const GRADE_THRESHOLDS: readonly Readonly<{ min: number; label: GradeLabel }>[] = Object.freeze([
  Object.freeze({ min: 90, label: 'Excellent' }),
  Object.freeze({ min: 75, label: 'Très bien' }),
  Object.freeze({ min: 60, label: 'Bien' }),
]);

const IGNORED_EVALUATION: Readonly<EvaluationResult> = Object.freeze({
  status: 'IGNORED',
});

export interface PracticeEngineState {
  readonly partition: PartitionPiece | null;
  readonly currentIndex: number;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly tempoBpm: number;
  readonly hasStartedFirstNote: boolean;
  readonly wrongAttemptsOnCurrentNote: number;
  readonly noteRecords: readonly NotePerformanceRecord[];
  readonly lastMatchTimeMs: number;
  readonly consecutiveTargetCount: number;
  readonly lastCandidateCents: number | null;
  readonly lastMatchedMidi: number | null;
  readonly minRmsSinceMatch: number;
  readonly hasReArticulated: boolean;
}

/**
 * Pure higher-order counting function over immutable collections.
 */
export function countWhere<T>(
  items: readonly T[],
  predicate: (item: T) => boolean
): number {
  return items.filter(predicate).length;
}

/**
 * Pure factory creating an immutable initial PracticeEngineState.
 */
export function createInitialPracticeState(
  partition: PartitionPiece | null = null
): Readonly<PracticeEngineState> {
  return Object.freeze({
    partition,
    currentIndex: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    startTimeMs: 0,
    endTimeMs: 0,
    tempoBpm: partition ? partition.tempo : 75,
    hasStartedFirstNote: false,
    wrongAttemptsOnCurrentNote: 0,
    noteRecords: Object.freeze([]),
    lastMatchTimeMs: 0,
    consecutiveTargetCount: 0,
    lastCandidateCents: null,
    lastMatchedMidi: null,
    minRmsSinceMatch: 0,
    hasReArticulated: true,
  });
}

/**
 * Pure check for whether `candidateMidi` is the same pitch or a natural string overtone
 * (octave +12, twelfth +19, or double octave +24) of `fundamentalMidi`.
 */
export function isSameOrNaturalHarmonic(
  fundamentalMidi: number,
  candidateMidi: number
): boolean {
  return HARMONIC_SEMITONE_OFFSETS.includes(candidateMidi - fundamentalMidi);
}

/**
 * Pure evaluation of rhythmic timing between consecutive note strikes.
 */
export function evaluateRhythmTiming(
  expectedIntervalMs: number,
  actualIntervalMs: number
): RhythmStatus {
  const toleranceMs = Math.max(280, Math.round(expectedIntervalMs * 0.35));
  const deltaMs = actualIntervalMs - expectedIntervalMs;
  if (deltaMs < -toleranceMs) {
    return 'early';
  }
  if (deltaMs > toleranceMs) {
    return 'late';
  }
  return 'on_time';
}

/**
 * Pure declarative mapping from overall percentage score to pedagogical French grade label.
 */
export function computeGradeLabel(scorePercent: number): GradeLabel {
  const matchedThreshold = GRADE_THRESHOLDS.find((entry) => scorePercent >= entry.min);
  return matchedThreshold ? matchedThreshold.label : 'À retravailler';
}

/**
 * Pure computation of the end-of-level grading breakdown from an immutable PracticeEngineState.
 */
export function computeGradeSummary(
  state: Readonly<PracticeEngineState>
): Readonly<LevelGradeSummary> {
  const totalNotes = state.partition ? state.partition.notes.length : 0;
  const evaluatedCount = state.noteRecords.length;

  if (totalNotes === 0 || evaluatedCount === 0) {
    return Object.freeze({
      totalNotes,
      correctPitchNotesCount: 0,
      onTimeRhythmNotesCount: 0,
      pitchScorePercent: 100,
      rhythmScorePercent: 100,
      overallScorePercent: 100,
      gradeLabel: 'Excellent',
      noteRecords: Object.freeze([]),
    });
  }

  const correctPitchNotesCount = countWhere(
    state.noteRecords,
    (record) => record.pitchCorrectFirstTry
  );
  const onTimeRhythmNotesCount = countWhere(
    state.noteRecords,
    (record) => record.rhythmStatus === 'on_time'
  );

  const pitchScorePercent = Math.round((correctPitchNotesCount / evaluatedCount) * 100);
  const rhythmScorePercent = Math.round((onTimeRhythmNotesCount / evaluatedCount) * 100);

  const isLectureOnly = state.partition?.mode === 'lecture';
  const overallScorePercent = isLectureOnly
    ? pitchScorePercent
    : Math.round(pitchScorePercent * 0.6 + rhythmScorePercent * 0.4);

  return Object.freeze({
    totalNotes,
    correctPitchNotesCount,
    onTimeRhythmNotesCount,
    pitchScorePercent,
    rhythmScorePercent,
    overallScorePercent,
    gradeLabel: computeGradeLabel(overallScorePercent),
    noteRecords: Object.freeze([...state.noteRecords]),
  });
}

/**
 * Pure state-transition function evaluating a single detected pitch frame against the current state.
 */
export function evaluatePitchTransition(
  state: Readonly<PracticeEngineState>,
  detectedPitch: PitchResult | null,
  nowMs: number
): Readonly<{
  state: Readonly<PracticeEngineState>;
  evaluation: Readonly<EvaluationResult>;
}> {
  if (!state.partition || state.currentIndex >= state.partition.notes.length) {
    return Object.freeze({ state, evaluation: IGNORED_EVALUATION });
  }

  // Silence or low-confidence ambient noise resets consecutive counter and marks key release
  if (
    !detectedPitch ||
    !detectedPitch.isPitched ||
    detectedPitch.confidence < MIN_CONFIDENCE ||
    detectedPitch.rms < MIN_RMS
  ) {
    const silenceState = Object.freeze({
      ...state,
      consecutiveTargetCount: 0,
      lastCandidateCents: null,
      hasReArticulated: true,
      minRmsSinceMatch: 0,
    });
    return Object.freeze({ state: silenceState, evaluation: IGNORED_EVALUATION });
  }

  // Track RMS decay and detect fresh hammer attack or pitch change since last matched note
  const nextMinRms = state.hasReArticulated
    ? 0
    : Math.min(state.minRmsSinceMatch, detectedPitch.rms);

  const nextHasReArticulated =
    state.hasReArticulated ||
    state.lastMatchedMidi === null ||
    !isSameOrNaturalHarmonic(state.lastMatchedMidi, detectedPitch.midi) ||
    detectedPitch.rms >= nextMinRms * 1.35;

  // Enforce 500ms refractory lockout AND harmonic decay lock
  if (nowMs - state.lastMatchTimeMs < REFRACTORY_LOCKOUT_MS || !nextHasReArticulated) {
    const lockedState = Object.freeze({
      ...state,
      minRmsSinceMatch: nextMinRms,
      hasReArticulated: nextHasReArticulated,
    });
    return Object.freeze({ state: lockedState, evaluation: IGNORED_EVALUATION });
  }

  const target = state.partition.notes[state.currentIndex];

  // Strict exact MIDI note match
  if (detectedPitch.midi !== target.midi) {
    const mismatchState = Object.freeze({
      ...state,
      minRmsSinceMatch: nextMinRms,
      hasReArticulated: true,
      consecutiveTargetCount: 0,
      lastCandidateCents: null,
      totalAttempts: state.totalAttempts + 1,
      wrongAttemptsOnCurrentNote: state.wrongAttemptsOnCurrentNote + 1,
    });
    const evaluation: Readonly<EvaluationResult> = Object.freeze({
      status: 'MISMATCH',
      targetNote: target,
      detectedPitch,
    });
    return Object.freeze({ state: mismatchState, evaluation });
  }

  // Check frequency stability across frames so random ambient noise cannot accumulate matches
  const isCentsUnstable =
    state.lastCandidateCents !== null &&
    Math.abs(detectedPitch.cents - state.lastCandidateCents) > MAX_CENTS_DRIFT;

  const nextConsecutiveCount = isCentsUnstable ? 1 : state.consecutiveTargetCount + 1;

  if (nextConsecutiveCount < CONSECUTIVE_FRAMES_REQUIRED) {
    const stabilizingState = Object.freeze({
      ...state,
      minRmsSinceMatch: nextMinRms,
      hasReArticulated: true,
      consecutiveTargetCount: nextConsecutiveCount,
      lastCandidateCents: detectedPitch.cents,
    });
    return Object.freeze({ state: stabilizingState, evaluation: IGNORED_EVALUATION });
  }

  // Confirmed note match!
  const isFirstNote = state.currentIndex === 0;
  const expectedIntervalMs = isFirstNote
    ? 0
    : getNoteTargetDurationMs(
        state.partition.notes[state.currentIndex - 1].duration,
        state.tempoBpm
      );
  const actualIntervalMs = isFirstNote ? 0 : nowMs - state.lastMatchTimeMs;
  const rhythmStatus: RhythmStatus = isFirstNote
    ? 'on_time'
    : evaluateRhythmTiming(expectedIntervalMs, actualIntervalMs);

  const noteRecord: Readonly<NotePerformanceRecord> = Object.freeze({
    noteIndex: state.currentIndex,
    noteId: target.id,
    solfegePitch: target.solfegePitch,
    pitchCorrectFirstTry: state.wrongAttemptsOnCurrentNote === 0,
    wrongAttemptsOnNote: state.wrongAttemptsOnCurrentNote,
    rhythmStatus,
    expectedIntervalMs,
    actualIntervalMs,
  });

  const nextIndex = state.currentIndex + 1;
  const isNowCompleted = nextIndex >= state.partition.notes.length;

  const matchedState = Object.freeze({
    ...state,
    currentIndex: nextIndex,
    totalAttempts: state.totalAttempts + 1,
    correctAttempts: state.correctAttempts + 1,
    startTimeMs: isFirstNote ? nowMs : state.startTimeMs,
    endTimeMs: isNowCompleted ? nowMs : state.endTimeMs,
    hasStartedFirstNote: true,
    wrongAttemptsOnCurrentNote: 0,
    noteRecords: Object.freeze([...state.noteRecords, noteRecord]),
    lastMatchTimeMs: nowMs,
    consecutiveTargetCount: 0,
    lastCandidateCents: null,
    lastMatchedMidi: target.midi,
    minRmsSinceMatch: detectedPitch.rms,
    hasReArticulated: false,
  });

  const evaluation: Readonly<EvaluationResult> = Object.freeze({
    status: 'MATCH',
    targetNote: target,
    detectedPitch,
    noteRecord,
  });

  return Object.freeze({ state: matchedState, evaluation });
}

/**
 * Sight-Reading & Rhythm Practice Engine backed by immutable state transitions.
 */
export class PracticeEngine {
  private state: Readonly<PracticeEngineState> = createInitialPracticeState();

  public getState(): Readonly<PracticeEngineState> {
    return this.state;
  }

  public loadPartition(partition: PartitionPiece): void {
    this.state = createInitialPracticeState(partition);
  }

  public setTempoBpm(bpm: number): void {
    const clampedBpm = Math.max(30, Math.min(220, bpm));
    this.state = Object.freeze({
      ...this.state,
      tempoBpm: clampedBpm,
    });
  }

  public getTempoBpm(): number {
    return this.state.tempoBpm;
  }

  public hasPerformanceStarted(): boolean {
    return this.state.hasStartedFirstNote;
  }

  public getLastMatchTimeMs(): number {
    return this.state.lastMatchTimeMs;
  }

  public getExpectedNextNoteIntervalMs(): number {
    if (!this.state.partition || this.state.currentIndex <= 0) {
      return 0;
    }
    const prevNote = this.state.partition.notes[this.state.currentIndex - 1];
    return getNoteTargetDurationMs(prevNote.duration, this.state.tempoBpm);
  }

  public getNoteRecords(): readonly NotePerformanceRecord[] {
    return this.state.noteRecords;
  }

  public processDetectedPitch(detectedPitch: PitchResult | null): Readonly<EvaluationResult> {
    const transition = evaluatePitchTransition(this.state, detectedPitch, Date.now());
    this.state = transition.state;
    return transition.evaluation;
  }

  public getGradeSummary(): Readonly<LevelGradeSummary> {
    return computeGradeSummary(this.state);
  }

  public getCurrentTargetNote(): MusicalNote | null {
    if (!this.state.partition || this.state.currentIndex >= this.state.partition.notes.length) {
      return null;
    }
    return this.state.partition.notes[this.state.currentIndex];
  }

  public getCurrentIndex(): number {
    return this.state.currentIndex;
  }

  public getTotalNotes(): number {
    return this.state.partition ? this.state.partition.notes.length : 0;
  }

  public isCompleted(): boolean {
    return (
      this.state.partition !== null &&
      this.state.currentIndex >= this.state.partition.notes.length
    );
  }

  public getAccuracyPercentage(): number {
    if (this.state.totalAttempts === 0) return 100;
    return Math.round((this.state.correctAttempts / this.state.totalAttempts) * 100);
  }

  public getTotalAttempts(): number {
    return this.state.totalAttempts;
  }

  public getCorrectAttempts(): number {
    return this.state.correctAttempts;
  }

  public getElapsedTimeSeconds(): number {
    if (!this.state.hasStartedFirstNote) return 0;
    const end = this.state.endTimeMs > 0 ? this.state.endTimeMs : Date.now();
    return Math.floor((end - this.state.startTimeMs) / 1000);
  }

  public getPartition(): PartitionPiece | null {
    return this.state.partition;
  }
}
