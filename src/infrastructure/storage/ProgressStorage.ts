export interface LevelProgress {
  readonly levelId: string;
  readonly completed: boolean;
  readonly bestAccuracy: number;
  readonly bestTimeSeconds: number;
  readonly lastPlayedAt: number;
}

const STORAGE_KEY = 'piano_cadence_progress_v1';

export class ProgressStorage {
  public static getProgress(): Readonly<Record<string, LevelProgress>> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return Object.freeze({});
      return Object.freeze(JSON.parse(data) as Record<string, LevelProgress>);
    } catch {
      return Object.freeze({});
    }
  }

  public static getLevelProgress(levelId: string): LevelProgress | null {
    const all = this.getProgress();
    return all[levelId] || null;
  }

  public static recordLevelCompletion(
    levelId: string,
    accuracy: number,
    timeSeconds: number
  ): Readonly<LevelProgress> {
    const all = this.getProgress();
    const existing = all[levelId];

    const updated: Readonly<LevelProgress> = Object.freeze({
      levelId,
      completed: true,
      bestAccuracy: existing ? Math.max(existing.bestAccuracy, accuracy) : accuracy,
      bestTimeSeconds:
        existing && existing.bestTimeSeconds > 0
          ? Math.min(existing.bestTimeSeconds, timeSeconds)
          : timeSeconds,
      lastPlayedAt: Date.now(),
    });

    const nextProgressMap = Object.freeze({
      ...all,
      [levelId]: updated,
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgressMap));
    } catch (e) {
      console.warn('Could not save progress to localStorage', e);
    }

    return updated;
  }
}
