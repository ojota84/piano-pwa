import {
  MusicalNote,
  PartitionPiece,
} from '../models/music.types.ts';
import {
  PitchResult,
  EvaluationResult,
} from '../models/pitch.types.ts';

/**
 * "Wait For Me" Sight-Reading Practice Engine (Pure Domain).
 *
 * Core Business Rules:
 * 1. Exact MIDI matching between target Solfège note and detected piano pitch.
 * 2. 500ms refractory lockout to prevent piano string resonance from double-triggering.
 * 3. Harmonic & sustain decay lock: after matching a note (e.g. La 4), neither that same note
 *    nor its natural harmonics (La 5 octave, Mi 6 twelfth) can trigger the next note unless
 *    a genuine new key strike (silence release or acoustic RMS attack surge) occurs.
 * 4. 2-frame consecutive confirmation with pitch-cents stability and minimum confidence (>= 0.68)
 *    to reject ambient room noise when no piano key is played.
 */
export class PracticeEngine {
  private partition: PartitionPiece | null = null;
  private currentIndex = 0;
  private totalAttempts = 0;
  private correctAttempts = 0;
  private startTimeMs = 0;
  private endTimeMs = 0;

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
    this.startTimeMs = Date.now();
    this.endTimeMs = 0;
    this.lastMatchTimeMs = 0;
    this.consecutiveTargetCount = 0;
    this.lastCandidateCents = null;
    this.lastMatchedMidi = null;
    this.minRmsSinceMatch = 0;
    this.hasReArticulated = true;
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
        };
      } else {
        return { status: 'IGNORED' };
      }
    } else {
      this.consecutiveTargetCount = 0;
      this.lastCandidateCents = null;
      this.totalAttempts++;
      return {
        status: 'MISMATCH',
        targetNote: target,
        detectedPitch,
      };
    }
  }

  /**
   * Returns true if `candidateMidi` is the same note or a prominent piano string overtone
   * of `fundamentalMidi` (+12 octave, +19 twelfth, +24 double octave).
   */
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
    if (this.startTimeMs === 0) return 0;
    const end = this.endTimeMs > 0 ? this.endTimeMs : Date.now();
    return Math.floor((end - this.startTimeMs) / 1000);
  }

  public getPartition(): PartitionPiece | null {
    return this.partition;
  }
}
