import {
  LevelProgress,
  ProgressRepositoryPort,
} from '../../core/ports/ProgressRepositoryPort.ts';

export type { LevelProgress };

const STORAGE_KEY = 'piano_cadence_progress_v1';

/**
 * Infrastructure Adapter implementing ProgressRepositoryPort backed by browser localStorage.
 */
export class LocalStorageProgressRepository implements ProgressRepositoryPort {
  public getProgress(): Readonly<Record<string, LevelProgress>> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return Object.freeze({});
      return Object.freeze(JSON.parse(data) as Record<string, LevelProgress>);
    } catch {
      return Object.freeze({});
    }
  }

  public getLevelProgress(levelId: string): Readonly<LevelProgress> | null {
    const all = this.getProgress();
    return all[levelId] || null;
  }

  public recordLevelCompletion(
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

export const progressRepository: ProgressRepositoryPort = new LocalStorageProgressRepository();

export class ProgressStorage {
  public static getProgress(): Readonly<Record<string, LevelProgress>> {
    return progressRepository.getProgress();
  }

  public static getLevelProgress(levelId: string): Readonly<LevelProgress> | null {
    return progressRepository.getLevelProgress(levelId);
  }

  public static recordLevelCompletion(
    levelId: string,
    accuracy: number,
    timeSeconds: number
  ): Readonly<LevelProgress> {
    return progressRepository.recordLevelCompletion(levelId, accuracy, timeSeconds);
  }
}
