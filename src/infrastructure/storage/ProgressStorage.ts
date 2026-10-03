export interface LevelProgress {
  levelId: string;
  completed: boolean;
  bestAccuracy: number;
  bestTimeSeconds: number;
  lastPlayedAt: number;
}

const STORAGE_KEY = 'piano_cadence_progress_v1';

export class ProgressStorage {
  public static getProgress(): Record<string, LevelProgress> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return {};
      return JSON.parse(data);
    } catch {
      return {};
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
  ): LevelProgress {
    const all = this.getProgress();
    const existing = all[levelId];

    const updated: LevelProgress = {
      levelId,
      completed: true,
      bestAccuracy: existing ? Math.max(existing.bestAccuracy, accuracy) : accuracy,
      bestTimeSeconds: existing && existing.bestTimeSeconds > 0
        ? Math.min(existing.bestTimeSeconds, timeSeconds)
        : timeSeconds,
      lastPlayedAt: Date.now(),
    };

    all[levelId] = updated;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Could not save progress to localStorage', e);
    }

    return updated;
  }
}
