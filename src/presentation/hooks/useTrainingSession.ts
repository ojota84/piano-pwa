import { useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { PartitionPiece } from '../../core/models/music.types.ts';
import { PitchResult } from '../../core/models/pitch.types.ts';
import {
  TrainingSessionCoordinator,
  SessionSnapshot,
} from '../../core/engine/TrainingSessionCoordinator.ts';
import {
  LevelProgress,
  ProgressRepositoryPort,
} from '../../core/ports/ProgressRepositoryPort.ts';

/**
 * Custom React Hook encapsulating the Domain TrainingSessionCoordinator and ProgressRepositoryPort.
 * Exposes immutable SessionSnapshot and progressMap state with stable action callbacks.
 */
export function useTrainingSession(
  initialPiece: PartitionPiece,
  progressRepo: ProgressRepositoryPort
) {
  const coordinatorRef = useRef<TrainingSessionCoordinator>(
    new TrainingSessionCoordinator(initialPiece)
  );

  const [session, setSession] = useState<Readonly<SessionSnapshot>>(() =>
    new TrainingSessionCoordinator(initialPiece).getSnapshot()
  );

  const [progressMap, setProgressMap] = useState<Readonly<Record<string, LevelProgress>>>(() =>
    progressRepo.getProgress()
  );

  const onPitchDetected = useCallback(
    (detected: PitchResult) => {
      const { snapshot } = coordinatorRef.current.handlePitchDetected(detected);
      setSession(snapshot);

      if (snapshot.justCompletedLevel) {
        progressRepo.recordLevelCompletion(
          snapshot.selectedPiece.id,
          snapshot.gradeSummary.overallScorePercent,
          snapshot.elapsedSeconds
        );
        setProgressMap(progressRepo.getProgress());

        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    },
    [progressRepo]
  );

  const startLevel = useCallback((level: PartitionPiece) => {
    const snapshot = coordinatorRef.current.startLevel(level);
    setSession(snapshot);
  }, []);

  const resetLevel = useCallback((piece?: PartitionPiece) => {
    const snapshot = coordinatorRef.current.resetLevel(piece);
    setSession(snapshot);
  }, []);

  const backToHub = useCallback(() => {
    const snapshot = coordinatorRef.current.backToHub();
    setSession(snapshot);
  }, []);

  const setTempoBpm = useCallback((bpm: number) => {
    const snapshot = coordinatorRef.current.setTempoBpm(bpm);
    setSession(snapshot);
  }, []);

  const clearPitch = useCallback(() => {
    const snapshot = coordinatorRef.current.clearPitch();
    setSession(snapshot);
  }, []);

  const getElapsedTimeSeconds = useCallback(() => {
    return coordinatorRef.current.getEngine().getElapsedTimeSeconds();
  }, []);

  return {
    session,
    progressMap,
    onPitchDetected,
    startLevel,
    resetLevel,
    backToHub,
    setTempoBpm,
    clearPitch,
    getElapsedTimeSeconds,
  };
}
