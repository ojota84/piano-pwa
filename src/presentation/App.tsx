import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { PartitionPiece } from '../core/models/music.types.ts';
import { PitchResult } from '../core/models/pitch.types.ts';
import {
  TrainingSessionCoordinator,
  SessionSnapshot,
} from '../core/engine/TrainingSessionCoordinator.ts';
import { AudioPitchPort } from '../core/ports/AudioPitchPort.ts';
import { WebAudioPitchAdapter } from '../infrastructure/audio/WebAudioPitchAdapter.ts';
import { partitionRepository } from '../infrastructure/data/InMemoryPartitionRepository.ts';
import { ProgressStorage } from '../infrastructure/storage/ProgressStorage.ts';
import { CurriculumHub } from './components/CurriculumHub.tsx';
import { FocusTrainingView } from './components/FocusTrainingView.tsx';
import { AndroidSyncModal } from './components/AndroidSyncModal.tsx';

export default function App() {
  const allPartitions = partitionRepository.getAllPartitions();

  // Pure Domain Session Coordinator (authoritative state for Hub <-> Training & Pitch/Rhythm evaluation)
  const coordinatorRef = useRef<TrainingSessionCoordinator>(
    new TrainingSessionCoordinator(allPartitions[0])
  );

  const [session, setSession] = useState<SessionSnapshot>(() =>
    coordinatorRef.current.getSnapshot()
  );
  const [isListening, setIsListening] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Infrastructure Port Adapter (Web Audio API)
  const audioAdapterRef = useRef<AudioPitchPort | null>(null);

  // Audio adapter lifecycle
  useEffect(() => {
    audioAdapterRef.current = new WebAudioPitchAdapter();
    return () => {
      if (audioAdapterRef.current) {
        audioAdapterRef.current.stop();
      }
    };
  }, []);

  // Screen Wake Lock API: Keeps phone display awake during piano practice sessions
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const manageWakeLock = async () => {
      if ('wakeLock' in navigator && isListening && session.activeScreen === 'training') {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
          // Graceful fallback if backgrounded or battery saver prevents lock
        }
      } else if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch {
          // ignore
        }
      }
    };

    manageWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isListening, session.activeScreen]);

  // Practice timer loop
  useEffect(() => {
    if (session.isCompleted || session.activeScreen !== 'training') return;
    const interval = setInterval(() => {
      setElapsedSeconds(coordinatorRef.current.getEngine().getElapsedTimeSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [session.isCompleted, session.activeScreen]);

  /**
   * Stable Audio Pitch Callback:
   * Delegates directly to TrainingSessionCoordinator instance ref, guaranteeing
   * zero stale React state closures when transitioning from Hub to Training.
   */
  const onPitchDetected = useRef((detected: PitchResult) => {
    const { snapshot } = coordinatorRef.current.handlePitchDetected(detected);
    setSession(snapshot);

    if (snapshot.justCompletedLevel) {
      ProgressStorage.recordLevelCompletion(
        snapshot.selectedPiece.id,
        snapshot.gradeSummary.overallScorePercent,
        snapshot.elapsedSeconds
      );

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }).current;

  const toggleListening = async () => {
    if (!audioAdapterRef.current) return;

    if (isListening) {
      audioAdapterRef.current.stop();
      setIsListening(false);
      setSession(coordinatorRef.current.clearPitch());
    } else {
      try {
        await audioAdapterRef.current.start(onPitchDetected);
        setIsListening(true);
      } catch (err: unknown) {
        console.error('Microphone error:', err);
      }
    }
  };

  const resumeAudio = async () => {
    if (audioAdapterRef.current) {
      await audioAdapterRef.current.resumeAudio();
    }
  };

  const resetPiece = (piece?: PartitionPiece) => {
    const snapshot = coordinatorRef.current.resetLevel(piece);
    setSession(snapshot);
    setElapsedSeconds(0);
  };

  const handleStartLevel = (level: PartitionPiece) => {
    const snapshot = coordinatorRef.current.startLevel(level);
    setSession(snapshot);
    setElapsedSeconds(0);

    // Auto-start or refresh listening callback for seamless practice
    if (audioAdapterRef.current) {
      audioAdapterRef.current
        .start(onPitchDetected)
        .then(() => {
          setIsListening(true);
        })
        .catch(() => {});
    }
  };

  const handleBackToHub = () => {
    const snapshot = coordinatorRef.current.backToHub();
    setSession(snapshot);
  };

  const handleSetTempoBpm = (bpm: number) => {
    const snapshot = coordinatorRef.current.setTempoBpm(bpm);
    setSession(snapshot);
  };

  // Find next level in numerical sequence
  const currentIdx = allPartitions.findIndex((p) => p.id === session.selectedPiece.id);
  const nextLevel =
    currentIdx >= 0 && currentIdx < allPartitions.length - 1
      ? allPartitions[currentIdx + 1]
      : null;

  return (
    <>
      {session.activeScreen === 'hub' ? (
        <CurriculumHub
          levels={allPartitions}
          onSelectLevel={handleStartLevel}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      ) : (
        <FocusTrainingView
          level={session.selectedPiece}
          nextLevel={nextLevel}
          currentIndex={session.currentIndex}
          accuracy={session.accuracy}
          elapsedSeconds={elapsedSeconds}
          isCompleted={session.isCompleted}
          hasPerformanceStarted={session.hasPerformanceStarted}
          tempoBpm={session.tempoBpm}
          gradeSummary={session.gradeSummary}
          isListening={isListening}
          currentPitch={session.currentPitch}
          lastMismatch={session.lastMismatch}
          onBackToHub={handleBackToHub}
          onReset={() => resetPiece()}
          onSelectNextLevel={(next) => resetPiece(next)}
          onSetTempoBpm={handleSetTempoBpm}
          onToggleListening={toggleListening}
          onResumeAudio={resumeAudio}
          onSetSensitivity={(thresh) => {
            if (audioAdapterRef.current) {
              audioAdapterRef.current.setSensitivityThreshold(thresh);
            }
          }}
          onSetGain={(gain) => {
            if (audioAdapterRef.current) {
              audioAdapterRef.current.setInputGain(gain);
            }
          }}
        />
      )}

      <AndroidSyncModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
