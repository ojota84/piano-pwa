import { PartitionPiece } from '../models/music.types.ts';
import {
  PitchResult,
  EvaluationResult,
  LevelGradeSummary,
} from '../models/pitch.types.ts';
import { PracticeEngine } from './PracticeEngine.ts';

export type ScreenMode = 'hub' | 'training';

export interface SessionSnapshot {
  readonly runId: number;
  readonly activeScreen: ScreenMode;
  readonly selectedPiece: PartitionPiece;
  readonly currentIndex: number;
  readonly isCompleted: boolean;
  readonly hasPerformanceStarted: boolean;
  readonly lastMatchTimeMs: number;
  readonly expectedIntervalMs: number;
  readonly tempoBpm: number;
  readonly accuracy: number;
  readonly gradeSummary: Readonly<LevelGradeSummary>;
  readonly lastMismatch: boolean;
  readonly elapsedSeconds: number;
  readonly currentPitch: PitchResult | null;
  readonly justCompletedLevel: boolean;
}

export interface CoordinatorState {
  readonly runId: number;
  readonly activeScreen: ScreenMode;
  readonly selectedPiece: PartitionPiece;
  readonly lastMismatch: boolean;
  readonly currentPitch: PitchResult | null;
  readonly justCompletedLevel: boolean;
}

const IGNORED_EVALUATION: Readonly<EvaluationResult> = Object.freeze({
  status: 'IGNORED',
});

/**
 * Pure Domain Coordinator for the 2-Screen Practice Journey ('hub' <-> 'training'),
 * backed by an immutable CoordinatorState.
 */
export class TrainingSessionCoordinator {
  private readonly engine: PracticeEngine;
  private state: Readonly<CoordinatorState>;

  constructor(initialPiece: PartitionPiece, engine: PracticeEngine = new PracticeEngine()) {
    this.engine = engine;
    this.engine.loadPartition(initialPiece);
    this.state = Object.freeze({
      runId: 1,
      activeScreen: 'hub',
      selectedPiece: initialPiece,
      lastMismatch: false,
      currentPitch: null,
      justCompletedLevel: false,
    });
  }

  public startLevel(level: PartitionPiece): Readonly<SessionSnapshot> {
    this.engine.loadPartition(level);
    this.state = Object.freeze({
      ...this.state,
      runId: this.state.runId + 1,
      selectedPiece: level,
      activeScreen: 'training',
      lastMismatch: false,
      justCompletedLevel: false,
    });
    return this.getSnapshot();
  }

  public resetLevel(level: PartitionPiece = this.state.selectedPiece): Readonly<SessionSnapshot> {
    this.engine.loadPartition(level);
    this.state = Object.freeze({
      ...this.state,
      runId: this.state.runId + 1,
      selectedPiece: level,
      lastMismatch: false,
      justCompletedLevel: false,
    });
    return this.getSnapshot();
  }

  public setTempoBpm(bpm: number): Readonly<SessionSnapshot> {
    this.engine.setTempoBpm(bpm);
    this.state = Object.freeze({
      ...this.state,
      justCompletedLevel: false,
    });
    return this.getSnapshot();
  }

  public backToHub(): Readonly<SessionSnapshot> {
    this.state = Object.freeze({
      ...this.state,
      activeScreen: 'hub',
      lastMismatch: false,
      justCompletedLevel: false,
    });
    return this.getSnapshot();
  }

  public handlePitchDetected(detected: PitchResult): Readonly<{
    evaluation: Readonly<EvaluationResult>;
    snapshot: Readonly<SessionSnapshot>;
  }> {
    if (this.state.activeScreen !== 'training' || this.engine.isCompleted()) {
      this.state = Object.freeze({
        ...this.state,
        currentPitch: detected,
        justCompletedLevel: false,
      });
      return Object.freeze({
        evaluation: IGNORED_EVALUATION,
        snapshot: this.getSnapshot(),
      });
    }

    const evaluation = this.engine.processDetectedPitch(detected.isPitched ? detected : null);
    const nextMismatch =
      evaluation.status === 'MISMATCH'
        ? true
        : evaluation.status === 'MATCH'
        ? false
        : this.state.lastMismatch;

    this.state = Object.freeze({
      ...this.state,
      currentPitch: detected,
      lastMismatch: nextMismatch,
      justCompletedLevel: this.engine.isCompleted(),
    });

    return Object.freeze({
      evaluation,
      snapshot: this.getSnapshot(),
    });
  }

  public clearPitch(): Readonly<SessionSnapshot> {
    this.state = Object.freeze({
      ...this.state,
      currentPitch: null,
      justCompletedLevel: false,
    });
    return this.getSnapshot();
  }

  public getEngine(): PracticeEngine {
    return this.engine;
  }

  public getSnapshot(): Readonly<SessionSnapshot> {
    return Object.freeze({
      runId: this.state.runId,
      activeScreen: this.state.activeScreen,
      selectedPiece: this.state.selectedPiece,
      currentIndex: this.engine.getCurrentIndex(),
      isCompleted: this.engine.isCompleted(),
      hasPerformanceStarted: this.engine.hasPerformanceStarted(),
      lastMatchTimeMs: this.engine.getLastMatchTimeMs(),
      expectedIntervalMs: this.engine.getExpectedNextNoteIntervalMs(),
      tempoBpm: this.engine.getTempoBpm(),
      accuracy: this.engine.getAccuracyPercentage(),
      gradeSummary: this.engine.getGradeSummary(),
      lastMismatch: this.state.lastMismatch,
      elapsedSeconds: this.engine.getElapsedTimeSeconds(),
      currentPitch: this.state.currentPitch,
      justCompletedLevel: this.state.justCompletedLevel,
    });
  }
}
