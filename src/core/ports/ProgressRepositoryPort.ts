export interface LevelProgress {
  readonly levelId: string;
  readonly completed: boolean;
  readonly bestAccuracy: number;
  readonly bestTimeSeconds: number;
  readonly lastPlayedAt: number;
}

export interface ProgressRepositoryPort {
  getProgress(): Readonly<Record<string, LevelProgress>>;
  getLevelProgress(levelId: string): Readonly<LevelProgress> | null;
  recordLevelCompletion(
    levelId: string,
    accuracy: number,
    timeSeconds: number
  ): Readonly<LevelProgress>;
}
