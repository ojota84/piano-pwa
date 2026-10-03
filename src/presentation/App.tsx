import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Music,
  RotateCcw,
  Smartphone,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { PartitionPiece } from '../core/models/music.types.ts';
import { PitchResult } from '../core/models/pitch.types.ts';
import { PracticeEngine } from '../core/engine/PracticeEngine.ts';
import { AudioPitchPort } from '../core/ports/AudioPitchPort.ts';
import { WebAudioPitchAdapter } from '../infrastructure/audio/WebAudioPitchAdapter.ts';
import { partitionRepository } from '../infrastructure/data/InMemoryPartitionRepository.ts';
import { StaffView } from './components/StaffView.tsx';
import { AcousticTuner } from './components/AcousticTuner.tsx';
import { AndroidSyncModal } from './components/AndroidSyncModal.tsx';

export default function App() {
  const allPartitions = partitionRepository.getAllPartitions();
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

  // Screen Wake Lock API: Keeps the Galaxy S21 display awake during piano practice sessions
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const manageWakeLock = async () => {
      if ('wakeLock' in navigator && isListening) {
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
  }, [isListening]);

  // Practice timer loop
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setElapsedSeconds(engineRef.current.getElapsedTimeSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  /**
   * Presentation Presenter: Delegates raw pitch events from audio port to domain engine.
   * Updates UI state exclusively based on domain evaluation.
   */
  const handlePitchDetected = (detected: PitchResult) => {
    setCurrentPitch(detected);

    if (isCompleted) return;

    const evalResult = engineRef.current.processDetectedPitch(
      detected.isPitched ? detected : null
    );

    if (evalResult.status === 'MATCH') {
      setCurrentIndex(engineRef.current.getCurrentIndex());
      setAccuracy(engineRef.current.getAccuracyPercentage());
      setLastMismatch(false);

      if (engineRef.current.isCompleted()) {
        setIsCompleted(true);
        confetti({
          particleCount: 80,
          spread: 70,
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

  const targetNote = selectedPiece.notes[currentIndex] || selectedPiece.notes[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">Cadence</span>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  Solfège
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Pupitre interactif pour piano acoustique avec Solfège</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Guide du pupitre</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Partition Tabs */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Choisissez un exercice :</span>
            <span className="text-amber-400 font-mono font-semibold">
              Clé de {selectedPiece.clef === 'treble' ? 'Sol' : 'Fa'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allPartitions.map((p) => {
              const isActive = p.id === selectedPiece.id;
              return (
                <button
                  key={p.id}
                  onClick={() => resetPiece(p)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/5'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    {p.difficulty}
                  </div>
                  <div className="text-xs font-bold truncate mt-0.5">
                    {p.title.split(':')[1]?.trim() || p.title}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Piece Stats */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {selectedPiece.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedPiece.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 uppercase">Progression</span>
              <span className="font-bold text-amber-400">
                {currentIndex} / {selectedPiece.notes.length} notes
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 uppercase">Précision</span>
              <span className="font-bold text-emerald-400">{accuracy}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 uppercase">Temps</span>
              <span className="font-bold text-slate-300">{elapsedSeconds}s</span>
            </div>
            <button
              onClick={() => resetPiece()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Recommencer le morceau"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Staff / Pentagram View */}
        <section className="flex flex-col gap-2">
          <StaffView
            notes={selectedPiece.notes}
            currentIndex={currentIndex}
            clef={selectedPiece.clef}
            lastMismatch={lastMismatch}
          />

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-pulse" />
              <span>
                Note cible : <strong className="text-amber-300">{targetNote.solfegePitch}</strong>
              </span>
            </span>
            <span className="text-emerald-400 font-semibold">✓ = Validé sur le piano</span>
          </div>
        </section>

        {/* Acoustic Tuner */}
        <section>
          <AcousticTuner
            isListening={isListening}
            onToggleListening={toggleListening}
            onResumeAudio={resumeAudio}
            currentPitch={currentPitch}
            targetPitch={targetNote.solfegePitch}
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
        </section>

        {/* Completion Modal */}
        {isCompleted && (
          <div className="rounded-3xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Bravo ! Morceau terminé !</h2>
            <p className="text-sm text-slate-300 max-w-md mt-1">
              Vous avez joué toutes les notes de <span className="text-amber-400 font-bold">{selectedPiece.title}</span> avec une précision de <span className="text-emerald-400 font-bold">{accuracy}%</span>.
            </p>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => resetPiece()}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm transition-colors border border-slate-700"
              >
                Rejouer
              </button>
              {allPartitions.findIndex((p) => p.id === selectedPiece.id) < allPartitions.length - 1 && (
                <button
                  onClick={() => {
                    const currentIdx = allPartitions.findIndex((p) => p.id === selectedPiece.id);
                    resetPiece(allPartitions[currentIdx + 1]);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors"
                >
                  <span>Morceau Suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <AndroidSyncModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
