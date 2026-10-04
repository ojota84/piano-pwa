import { PartitionPiece } from '../models/music.types.ts';
import { PitchResult, EvaluationResult } from '../models/pitch.types.ts';
import { PracticeEngine } from './PracticeEngine.ts';

export type ScreenMode = 'hub' | 'training';

export interface SessionSnapshot {
  activeScreen: ScreenMode;
  selectedPiece: PartitionPiece;
  currentIndex: number;
  isCompleted: boolean;
  accuracy: number;
  lastMismatch: boolean;
  elapsedSeconds: number;
  currentPitch: PitchResult | null;
  justCompletedLevel: boolean;
}

/**
 * Pure Domain Coordinator for the 2-Screen Practice Journey ('hub' <-> 'training').
 *
 * Eliminates UI closure bugs by maintaining authoritative state for the active screen,
 * selected partition level, and PracticeEngine evaluation lifecycle.
 */
export class TrainingSessionCoordinator {
  private readonly engine: PracticeEngine;
  private activeScreen: ScreenMode = 'hub';
  private selectedPiece: PartitionPiece;
  private lastMismatch = false;
  private currentPitch: PitchResult | null = null;

  constructor(initialPiece: PartitionPiece, engine: PracticeEngine = new PracticeEngine()) {
    this.engine = engine;
    this.selectedPiece = initialPiece;
    this.engine.loadPartition(initialPiece);
  }

  /**
   * Transitions from the Curriculum Hub into the Focus Training View for the given level
   * and resets the PracticeEngine for that partition.
   */
  public startLevel(level: PartitionPiece): SessionSnapshot {
    this.selectedPiece = level;
    this.activeScreen = 'training';
    this.lastMismatch = false;
    this.engine.loadPartition(level);
    return this.getSnapshot(false);
  }

  /**
   * Resets the current or specified partition while remaining in the current screen.
   */
  public resetLevel(level: PartitionPiece = this.selectedPiece): SessionSnapshot {
    this.selectedPiece = level;
    this.lastMismatch = false;
    this.engine.loadPartition(level);
    return this.getSnapshot(false);
  }

  /**
   * Returns to the Curriculum Hub screen.
   */
  public backToHub(): SessionSnapshot {
    this.activeScreen = 'hub';
    this.lastMismatch = false;
    return this.getSnapshot(false);
  }

  /**
   * Processes a live microphone pitch detection frame.
   * Always records `currentPitch` for the tuner display, and evaluates the note
   * against PracticeEngine whenever `activeScreen === 'training'` and the level is not yet completed.
   */
  public handlePitchDetected(detected: PitchResult): {
    evaluation: EvaluationResult;
    snapshot: SessionSnapshot;
  } {
    this.currentPitch = detected;

    if (this.activeScreen !== 'training' || this.engine.isCompleted()) {
      return {
        evaluation: { status: 'IGNORED' },
        snapshot: this.getSnapshot(false),
      };
    }

    const wasCompleted = this.engine.isCompleted();
    const evaluation = this.engine.processDetectedPitch(detected.isPitched ? detected : null);

    if (evaluation.status === 'MATCH') {
      this.lastMismatch = false;
    } else if (evaluation.status === 'MISMATCH') {
      this.lastMismatch = true;
    }

    const isNowCompleted = this.engine.isCompleted();
    const justCompletedLevel = !wasCompleted && isNowCompleted;

    return {
      evaluation,
      snapshot: this.getSnapshot(justCompletedLevel),
    };
  }

  public clearPitch(): SessionSnapshot {
    this.currentPitch = null;
    return this.getSnapshot(false);
  }

  public getEngine(): PracticeEngine {
    return this.engine;
  }

  public getSnapshot(justCompletedLevel = false): SessionSnapshot {
    return {
      activeScreen: this.activeScreen,
      selectedPiece: this.selectedPiece,
      currentIndex: this.engine.getCurrentIndex(),
      isCompleted: this.engine.isCompleted(),
      accuracy: this.engine.getAccuracyPercentage(),
      lastMismatch: this.lastMismatch,
      elapsedSeconds: this.engine.getElapsedTimeSeconds(),
      currentPitch: this.currentPitch,
      justCompletedLevel,
    };
  }
}
