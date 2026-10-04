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
} from '../models/pitch.types.ts';
import { getNoteTargetDurationMs } from '../theory/musicTheory.ts';

/**
 * Sight-Reading & Rhythm Practice Engine (Pure Domain).
 *
 * Core Business Rules:
 * 1. Exact MIDI matching between target Solfège note and detected piano pitch.
 * 2. Performance evaluation & stopwatch start ONLY when the 1st note (index 0) is played.
 * 3. Supports two lesson modes:
 *    - 'lecture': Evaluates note reading accuracy (100% pitch accuracy).
 *    - 'rythme': Evaluates both note reading accuracy and rhythmic timing at active BPM.
 * 4. 500ms refractory lockout + Harmonic & sustain decay lock to prevent string resonance/overtones
 *    (e.g. La 4 -> La 5) from false-triggering.
 * 5. 2-frame consecutive confirmation with pitch-cents stability and minimum confidence (>= 0.68).
 */
export class PracticeEngine {
  private partition: PartitionPiece | null = null;
  private currentIndex = 0;
  private totalAttempts = 0;
  private correctAttempts = 0;
  private startTimeMs = 0;
  private endTimeMs = 0;
  private tempoBpm = 75;

  // Per-note rhythm & pitch grading state
  private hasStartedFirstNote = false;
  private wrongAttemptsOnCurrentNote = 0;
  private noteRecords: NotePerformanceRecord[] = [];

  // Timing, Stability & Harmonic Decay Filters
  private lastMatchTimeMs = 0;
  private static readonly REFRACTORY_LOCKOUT_MS = 500;
  private static readonly MIN_CONFIDENCE = 0.68;
  private static readonly MIN_RMS = 0.004;
  private static readonly MAX_CENTS_DRIFT = 25;
  private consecutiveTargetCount = 0;
  private lastCandidateCents: number | null = null;
  private static readonly CONSECUTIVE_FRAMES_REQUIRED = 2;

  // Acoustic re-articulation tracking (prevents sustained notes & harmonics like La 4 -> La 5 from auto-triggering)
  private lastMatchedMidi: number | null = null;
  private minRmsSinceMatch = 0;
  private hasReArticulated = true;

  public loadPartition(partition: PartitionPiece): void {
    this.partition = partition;
    this.currentIndex = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.startTimeMs = 0;
    this.endTimeMs = 0;
    this.tempoBpm = partition.tempo || 75;
    this.hasStartedFirstNote = false;
    this.wrongAttemptsOnCurrentNote = 0;
    this.noteRecords = [];
    this.lastMatchTimeMs = 0;
    this.consecutiveTargetCount = 0;
    this.lastCandidateCents = null;
    this.lastMatchedMidi = null;
    this.minRmsSinceMatch = 0;
    this.hasReArticulated = true;
  }

  public setTempoBpm(bpm: number): void {
    this.tempoBpm = Math.max(30, Math.min(220, bpm));
  }

  public getTempoBpm(): number {
    return this.tempoBpm;
  }

  public hasPerformanceStarted(): boolean {
    return this.hasStartedFirstNote;
  }

  public getLastMatchTimeMs(): number {
    return this.lastMatchTimeMs;
  }

  /**
   * Returns the expected time interval in milliseconds from the previous note's match
   * to the current target note's strike, based on the previous note's rhythmic duration.
   */
  public getExpectedNextNoteIntervalMs(): number {
    if (!this.partition || !this.hasStartedFirstNote || this.currentIndex <= 0) {
      return 0;
    }
    const prevNote = this.partition.notes[this.currentIndex - 1];
    return prevNote ? getNoteTargetDurationMs(prevNote.duration, this.tempoBpm) : 0;
  }

  public getNoteRecords(): NotePerformanceRecord[] {
    return [...this.noteRecords];
  }

  public processDetectedPitch(detectedPitch: PitchResult | null): EvaluationResult {
    if (!this.partition || this.isCompleted()) {
      return { status: 'IGNORED' };
    }

    // Silence or low-confidence ambient noise resets consecutive counter and marks key release
    if (
      !detectedPitch ||
      !detectedPitch.isPitched ||
      detectedPitch.confidence < PracticeEngine.MIN_CONFIDENCE ||
      detectedPitch.rms < PracticeEngine.MIN_RMS
    ) {
      this.consecutiveTargetCount = 0;
      this.lastCandidateCents = null;
      this.hasReArticulated = true;
      this.minRmsSinceMatch = 0;
      return { status: 'IGNORED' };
    }

    // Track RMS decay and detect fresh hammer attack or pitch change since last matched note
    if (!this.hasReArticulated && this.lastMatchedMidi !== null) {
      if (detectedPitch.rms < this.minRmsSinceMatch) {
        this.minRmsSinceMatch = detectedPitch.rms;
      }

      const isSameOrHarmonicOfLast = this.isSameOrNaturalHarmonic(
        this.lastMatchedMidi,
        detectedPitch.midi
      );

      // A genuine new key strike either changes to a non-harmonic pitch OR produces a sharp RMS attack surge (>= 35%)
      if (!isSameOrHarmonicOfLast || detectedPitch.rms >= this.minRmsSinceMatch * 1.35) {
        this.hasReArticulated = true;
      }
    }

    const now = Date.now();

    // Enforce 500ms refractory lockout
    if (now - this.lastMatchTimeMs < PracticeEngine.REFRACTORY_LOCKOUT_MS) {
      return { status: 'IGNORED' };
    }

    const target = this.getCurrentTargetNote();
    if (!target) {
      return { status: 'IGNORED' };
    }

    // If the detected pitch is still the un-rearticulated decaying tail or overtone (e.g. La 4 -> La 5)
    // of the previously matched note, ignore it completely until a real key strike occurs.
    if (
      !this.hasReArticulated &&
      this.lastMatchedMidi !== null &&
      this.isSameOrNaturalHarmonic(this.lastMatchedMidi, detectedPitch.midi)
    ) {
      this.consecutiveTargetCount = 0;
      this.lastCandidateCents = null;
      return { status: 'IGNORED' };
    }

    // Strict exact MIDI note match (never allow octave harmonics to substitute for the target note)
    const isTargetPitchMatch = detectedPitch.midi === target.midi;

    if (isTargetPitchMatch) {
      // Check frequency stability across frames so random ambient noise cannot accumulate matches
      if (
        this.lastCandidateCents !== null &&
        Math.abs(detectedPitch.cents - this.lastCandidateCents) > PracticeEngine.MAX_CENTS_DRIFT
      ) {
        this.consecutiveTargetCount = 1;
        this.lastCandidateCents = detectedPitch.cents;
        return { status: 'IGNORED' };
      }

      this.consecutiveTargetCount++;
      this.lastCandidateCents = detectedPitch.cents;

      if (this.consecutiveTargetCount >= PracticeEngine.CONSECUTIVE_FRAMES_REQUIRED) {
        this.consecutiveTargetCount = 0;
        this.lastCandidateCents = null;

        // Evaluate Rhythm Timing:
        // Note 0 anchors and starts the performance evaluation clock!
        let rhythmStatus: RhythmStatus = 'on_time';
        let expectedIntervalMs = 0;
        let actualIntervalMs = 0;

        if (!this.hasStartedFirstNote || this.currentIndex === 0) {
          this.hasStartedFirstNote = true;
          this.startTimeMs = now;
          rhythmStatus = 'on_time';
        } else {
          const prevNote = this.partition.notes[this.currentIndex - 1];
          expectedIntervalMs = getNoteTargetDurationMs(prevNote.duration, this.tempoBpm);
          actualIntervalMs = now - this.lastMatchTimeMs;
          const toleranceMs = Math.max(280, Math.round(expectedIntervalMs * 0.35));
          const deltaMs = actualIntervalMs - expectedIntervalMs;

          if (Math.abs(deltaMs) <= toleranceMs) {
            rhythmStatus = 'on_time';
          } else if (deltaMs < -toleranceMs) {
            rhythmStatus = 'early';
          } else {
            rhythmStatus = 'late';
          }
        }

        const noteRecord: NotePerformanceRecord = {
          noteIndex: this.currentIndex,
          noteId: target.id,
          solfegePitch: target.solfegePitch,
          pitchCorrectFirstTry: this.wrongAttemptsOnCurrentNote === 0,
          wrongAttemptsOnNote: this.wrongAttemptsOnCurrentNote,
          rhythmStatus,
          expectedIntervalMs,
          actualIntervalMs,
        };

        this.noteRecords.push(noteRecord);
        this.wrongAttemptsOnCurrentNote = 0;

        this.lastMatchTimeMs = now;
        this.lastMatchedMidi = target.midi;
        this.minRmsSinceMatch = detectedPitch.rms;
        this.hasReArticulated = false;

        this.totalAttempts++;
        this.correctAttempts++;
        this.currentIndex++;

        if (this.isCompleted() && this.endTimeMs === 0) {
          this.endTimeMs = now;
        }

        return {
          status: 'MATCH',
          targetNote: target,
          detectedPitch,
          noteRecord,
        };
      } else {
        return { status: 'IGNORED' };
      }
    } else {
      this.consecutiveTargetCount = 0;
      this.lastCandidateCents = null;
      this.totalAttempts++;
      this.wrongAttemptsOnCurrentNote++;
      return {
        status: 'MISMATCH',
        targetNote: target,
        detectedPitch,
      };
    }
  }

  /**
   * Computes the end-of-level grading breakdown across all notes in the partition.
   * For 'lecture' lessons, overallScorePercent reflects pitch accuracy (100%).
   * For 'rythme' lessons, overallScorePercent combines pitch (60%) and rhythm (40%).
   */
  public getGradeSummary(): LevelGradeSummary {
    const totalNotes = this.partition ? this.partition.notes.length : 0;
    if (totalNotes === 0) {
      return {
        totalNotes: 0,
        correctPitchNotesCount: 0,
        onTimeRhythmNotesCount: 0,
        pitchScorePercent: 100,
        rhythmScorePercent: 100,
        overallScorePercent: 100,
        gradeLabel: 'Excellent',
        noteRecords: [],
      };
    }

    const correctPitchNotesCount = this.noteRecords.filter((r) => r.pitchCorrectFirstTry).length;
    const onTimeRhythmNotesCount = this.noteRecords.filter((r) => r.rhythmStatus === 'on_time').length;

    const evaluatedCount = Math.max(1, this.noteRecords.length);
    const pitchScorePercent = Math.round((correctPitchNotesCount / evaluatedCount) * 100);
    const rhythmScorePercent = Math.round((onTimeRhythmNotesCount / evaluatedCount) * 100);

    const isLectureOnly = this.partition?.mode === 'lecture';
    const overallScorePercent = isLectureOnly
      ? pitchScorePercent
      : Math.round(pitchScorePercent * 0.6 + rhythmScorePercent * 0.4);

    let gradeLabel: LevelGradeSummary['gradeLabel'] = 'À retravailler';
    if (overallScorePercent >= 90) {
      gradeLabel = 'Excellent';
    } else if (overallScorePercent >= 75) {
      gradeLabel = 'Très bien';
    } else if (overallScorePercent >= 60) {
      gradeLabel = 'Bien';
    }

    return {
      totalNotes,
      correctPitchNotesCount,
      onTimeRhythmNotesCount,
      pitchScorePercent,
      rhythmScorePercent,
      overallScorePercent,
      gradeLabel,
      noteRecords: [...this.noteRecords],
    };
  }

  private isSameOrNaturalHarmonic(fundamentalMidi: number, candidateMidi: number): boolean {
    const diff = candidateMidi - fundamentalMidi;
    return diff === 0 || diff === 12 || diff === 19 || diff === 24;
  }

  public getCurrentTargetNote(): MusicalNote | null {
    if (!this.partition || this.currentIndex >= this.partition.notes.length) {
      return null;
    }
    return this.partition.notes[this.currentIndex];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getTotalNotes(): number {
    return this.partition ? this.partition.notes.length : 0;
  }

  public isCompleted(): boolean {
    return this.partition !== null && this.currentIndex >= this.partition.notes.length;
  }

  public getAccuracyPercentage(): number {
    if (this.totalAttempts === 0) return 100;
    return Math.round((this.correctAttempts / this.totalAttempts) * 100);
  }

  public getTotalAttempts(): number {
    return this.totalAttempts;
  }

  public getCorrectAttempts(): number {
    return this.correctAttempts;
  }

  public getElapsedTimeSeconds(): number {
    if (!this.hasStartedFirstNote || this.startTimeMs === 0) return 0;
    const end = this.endTimeMs > 0 ? this.endTimeMs : Date.now();
    return Math.floor((end - this.startTimeMs) / 1000);
  }

  public getPartition(): PartitionPiece | null {
    return this.partition;
  }
}
