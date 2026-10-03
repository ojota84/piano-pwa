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
 * 1. Monophonic matching between target Solfège note and detected piano pitch.
 * 2. 500ms refractory lockout to prevent piano string resonance from double-triggering.
 * 3. 2-frame consecutive confirmation to reject transient clicks and ambient noise.
 * 4. Accuracy and timing statistics.
 */
export class PracticeEngine {
  private partition: PartitionPiece | null = null;
  private currentIndex = 0;
  private totalAttempts = 0;
  private correctAttempts = 0;
  private startTimeMs = 0;
  private endTimeMs = 0;

  // Timing & Noise Filters
  private lastMatchTimeMs = 0;
  private static readonly REFRACTORY_LOCKOUT_MS = 500;
  private consecutiveTargetCount = 0;
  private static readonly CONSECUTIVE_FRAMES_REQUIRED = 2;

  public loadPartition(partition: PartitionPiece): void {
    this.partition = partition;
    this.currentIndex = 0;
    this.totalAttempts = 0;
    this.correctAttempts = 0;
    this.startTimeMs = Date.now();
    this.endTimeMs = 0;
    this.lastMatchTimeMs = 0;
    this.consecutiveTargetCount = 0;
  }

  public processDetectedPitch(detectedPitch: PitchResult | null): EvaluationResult {
    if (!this.partition || this.isCompleted()) {
      return { status: 'IGNORED' };
    }

    if (!detectedPitch || !detectedPitch.isPitched) {
      this.consecutiveTargetCount = 0;
      return { status: 'IGNORED' };
    }

    const now = Date.now();

    // Enforce refractory lockout to prevent double triggers from vibrating strings
    if (now - this.lastMatchTimeMs < PracticeEngine.REFRACTORY_LOCKOUT_MS) {
      return { status: 'IGNORED' };
    }

    const target = this.getCurrentTargetNote();
    if (!target) {
      return { status: 'IGNORED' };
    }

    // Pitch matching: Exact MIDI note or acoustic harmonic resonance of the same Solfège note (within +/- 1 octave)
    const isTargetPitchMatch =
      detectedPitch.midi === target.midi ||
      (detectedPitch.solfegeName === target.step && Math.abs(detectedPitch.midi - target.midi) <= 12);

    if (isTargetPitchMatch) {
      this.consecutiveTargetCount++;

      if (this.consecutiveTargetCount >= PracticeEngine.CONSECUTIVE_FRAMES_REQUIRED) {
        this.consecutiveTargetCount = 0;
        this.lastMatchTimeMs = now;
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
      this.totalAttempts++;
      return {
        status: 'MISMATCH',
        targetNote: target,
        detectedPitch,
      };
    }
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
