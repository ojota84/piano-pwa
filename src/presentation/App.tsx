import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { PartitionPiece } from '../core/models/music.types.ts';
import { PitchResult } from '../core/models/pitch.types.ts';
import { PracticeEngine } from '../core/engine/PracticeEngine.ts';
import { AudioPitchPort } from '../core/ports/AudioPitchPort.ts';
import { WebAudioPitchAdapter } from '../infrastructure/audio/WebAudioPitchAdapter.ts';
import { partitionRepository } from '../infrastructure/data/InMemoryPartitionRepository.ts';
import { ProgressStorage } from '../infrastructure/storage/ProgressStorage.ts';
import { CurriculumHub } from './components/CurriculumHub.tsx';
import { FocusTrainingView } from './components/FocusTrainingView.tsx';
import { AndroidSyncModal } from './components/AndroidSyncModal.tsx';

export default function App() {
  const allPartitions = partitionRepository.getAllPartitions();

  // Screen Journey: 'hub' = Curriculum Catalog, 'training' = Focused Music Desk Practice
  const [activeScreen, setActiveScreen] = useState<'hub' | 'training'>('hub');
  const [selectedPiece, setSelectedPiece] = useState<PartitionPiece>(allPartitions[0]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const [lastMismatch, setLastMismatch] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Pure Domain Engine Instance
  const engineRef = useRef<PracticeEngine>(new PracticeEngine());

  // Infrastructure Port Adapter (Web Audio API)
  const audioAdapterRef = useRef<AudioPitchPort | null>(null);

  // Load partition into Domain Engine
  useEffect(() => {
    engineRef.current.loadPartition(selectedPiece);
    setCurrentIndex(0);
    setIsCompleted(false);
    setAccuracy(100);
    setLastMismatch(false);
    setElapsedSeconds(0);
  }, [selectedPiece]);

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
      if ('wakeLock' in navigator && isListening && activeScreen === 'training') {
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
  }, [isListening, activeScreen]);

  // Practice timer loop
  useEffect(() => {
    if (isCompleted || activeScreen !== 'training') return;
    const interval = setInterval(() => {
      setElapsedSeconds(engineRef.current.getElapsedTimeSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted, activeScreen]);

  /**
   * Presentation Presenter: Delegates raw pitch events from audio port to domain engine.
   * Updates UI state exclusively based on domain evaluation.
   */
  const handlePitchDetected = (detected: PitchResult) => {
    setCurrentPitch(detected);

    if (isCompleted || activeScreen !== 'training') return;

    const evalResult = engineRef.current.processDetectedPitch(
      detected.isPitched ? detected : null
    );

    if (evalResult.status === 'MATCH') {
      setCurrentIndex(engineRef.current.getCurrentIndex());
      setAccuracy(engineRef.current.getAccuracyPercentage());
      setLastMismatch(false);

      if (engineRef.current.isCompleted()) {
        setIsCompleted(true);
        const finalAccuracy = engineRef.current.getAccuracyPercentage();
        const finalTime = engineRef.current.getElapsedTimeSeconds();

        // Save progress to local storage
        ProgressStorage.recordLevelCompletion(selectedPiece.id, finalAccuracy, finalTime);

        // Celebration
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } else if (evalResult.status === 'MISMATCH') {
      setLastMismatch(true);
      setAccuracy(engineRef.current.getAccuracyPercentage());
    }
  };

  const toggleListening = async () => {
    if (!audioAdapterRef.current) return;

    if (isListening) {
      audioAdapterRef.current.stop();
      setIsListening(false);
      setCurrentPitch(null);
    } else {
      try {
        await audioAdapterRef.current.start(handlePitchDetected);
        setIsListening(true);
      } catch (err: unknown) {
        console.error('Microphone error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert(`Erreur micro : ${errMsg}\nAutorisez le micro dans Chrome.`);
      }
    }
  };

  const resumeAudio = async () => {
    if (audioAdapterRef.current) {
      await audioAdapterRef.current.resumeAudio();
    }
  };

  const resetPiece = (piece: PartitionPiece = selectedPiece) => {
    setSelectedPiece(piece);
    engineRef.current.loadPartition(piece);
    setCurrentIndex(0);
    setIsCompleted(false);
    setAccuracy(100);
    setLastMismatch(false);
    setElapsedSeconds(0);
  };

  const handleStartLevel = (level: PartitionPiece) => {
    resetPiece(level);
    setActiveScreen('training');

    // Auto-start listening if not already active for seamless practice
    if (!isListening && audioAdapterRef.current) {
      audioAdapterRef.current.start(handlePitchDetected).then(() => {
        setIsListening(true);
      }).catch(() => {});
    }
  };

  const handleBackToHub = () => {
    setActiveScreen('hub');
  };

  // Find next level in numerical sequence
  const currentIdx = allPartitions.findIndex((p) => p.id === selectedPiece.id);
  const nextLevel = currentIdx >= 0 && currentIdx < allPartitions.length - 1
    ? allPartitions[currentIdx + 1]
    : null;

  return (
    <>
      {activeScreen === 'hub' ? (
        <CurriculumHub
          levels={allPartitions}
          onSelectLevel={handleStartLevel}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      ) : (
        <FocusTrainingView
          level={selectedPiece}
          nextLevel={nextLevel}
          currentIndex={currentIndex}
          accuracy={accuracy}
          elapsedSeconds={elapsedSeconds}
          isCompleted={isCompleted}
          isListening={isListening}
          currentPitch={currentPitch}
          lastMismatch={lastMismatch}
          onBackToHub={handleBackToHub}
          onReset={() => resetPiece()}
          onSelectNextLevel={(next) => resetPiece(next)}
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
