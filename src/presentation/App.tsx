import React, { useState, useEffect, useRef } from 'react';
import { PartitionPiece } from '../core/models/music.types.ts';
import { AudioPitchPort } from '../core/ports/AudioPitchPort.ts';
import { WebAudioPitchAdapter } from '../infrastructure/audio/WebAudioPitchAdapter.ts';
import { partitionRepository } from '../infrastructure/data/InMemoryPartitionRepository.ts';
import { progressRepository } from '../infrastructure/storage/ProgressStorage.ts';
import { useTrainingSession } from './hooks/useTrainingSession.ts';
import { CurriculumHub } from './components/CurriculumHub.tsx';
import { FocusTrainingView } from './components/FocusTrainingView.tsx';
import { AndroidSyncModal } from './components/AndroidSyncModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

export default function App() {
  const allPartitions = partitionRepository.getAllPartitions();

  const {
    session,
    progressMap,
    onPitchDetected,
    startLevel,
    resetLevel,
    backToHub,
    setTempoBpm,
    clearPitch,
    getElapsedTimeSeconds,
  } = useTrainingSession(allPartitions[0], progressRepository);

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

  // Practice timer loop (re-anchored on every runId / Rejouer)
  useEffect(() => {
    if (session.isCompleted || session.activeScreen !== 'training') return;
    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedTimeSeconds());
    }, 250);
    return () => clearInterval(interval);
  }, [
    session.isCompleted,
    session.activeScreen,
    session.runId,
    session.hasPerformanceStarted,
    getElapsedTimeSeconds,
  ]);

  const toggleListening = async () => {
    if (!audioAdapterRef.current) return;

    if (isListening) {
      audioAdapterRef.current.stop();
      setIsListening(false);
      clearPitch();
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

  const handleResetPiece = (piece?: PartitionPiece) => {
    resetLevel(piece);
    setElapsedSeconds(0);
  };

  const handleStartLevel = (level: PartitionPiece) => {
    startLevel(level);
    setElapsedSeconds(0);

    if (audioAdapterRef.current) {
      audioAdapterRef.current
        .start(onPitchDetected)
        .then(() => {
          setIsListening(true);
        })
        .catch(() => {});
    }
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
          progressMap={progressMap}
          onSelectLevel={handleStartLevel}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      ) : (
        <FocusTrainingView
          key={`${session.selectedPiece.id}-${session.runId}`}
          runId={session.runId}
          level={session.selectedPiece}
          nextLevel={nextLevel}
          currentIndex={session.currentIndex}
          accuracy={session.accuracy}
          elapsedSeconds={elapsedSeconds}
          isCompleted={session.isCompleted}
          hasPerformanceStarted={session.hasPerformanceStarted}
          lastMatchTimeMs={session.lastMatchTimeMs}
          expectedIntervalMs={session.expectedIntervalMs}
          tempoBpm={session.tempoBpm}
          gradeSummary={session.gradeSummary}
          isListening={isListening}
          currentPitch={session.currentPitch}
          lastMismatch={session.lastMismatch}
          onBackToHub={backToHub}
          onReset={() => handleResetPiece()}
          onSelectNextLevel={(next) => handleResetPiece(next)}
          onSetTempoBpm={setTempoBpm}
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
      <OfflineIndicator />
    </>
  );
}
