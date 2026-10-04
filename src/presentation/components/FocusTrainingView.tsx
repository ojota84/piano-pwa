import React, { useEffect } from 'react';
import { ArrowLeft, RotateCcw, Check, ChevronRight } from 'lucide-react';
import { PartitionPiece } from '../../core/models/music.types.ts';
import { PitchResult } from '../../core/models/pitch.types.ts';
import { StaffView } from './StaffView.tsx';
import { AcousticTuner } from './AcousticTuner.tsx';

interface FocusTrainingViewProps {
  level: PartitionPiece;
  nextLevel: PartitionPiece | null;
  currentIndex: number;
  accuracy: number;
  elapsedSeconds: number;
  isCompleted: boolean;
  isListening: boolean;
  currentPitch: PitchResult | null;
  lastMismatch: boolean;
  onBackToHub: () => void;
  onReset: () => void;
  onSelectNextLevel: (nextLevel: PartitionPiece) => void;
  onToggleListening: () => void;
  onResumeAudio: () => void;
  onSetSensitivity: (val: number) => void;
  onSetGain: (val: number) => void;
}

export const FocusTrainingView: React.FC<FocusTrainingViewProps> = ({
  level,
  nextLevel,
  currentIndex,
  isCompleted,
  isListening,
  currentPitch,
  lastMismatch,
  onBackToHub,
  onReset,
  onSelectNextLevel,
  onToggleListening,
  onResumeAudio,
  onSetSensitivity,
  onSetGain,
}) => {
  const targetNote = level.notes[currentIndex] || level.notes[0];
  const isTreble = level.clef === 'treble';

  // Allow pressing Enter when level is completed to immediately launch the proposed next level
  useEffect(() => {
    if (!isCompleted || !nextLevel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSelectNextLevel(nextLevel);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, nextLevel, onSelectNextLevel]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Minimalist Top Bar */}
      <header className="border-b border-slate-900 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBackToHub}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Leçons</span>
          </button>

          {/* Center: Title + Clef */}
          <div className="flex items-center gap-3 min-w-0 truncate">
            <span className="text-sm sm:text-base font-medium text-slate-100 truncate">
              {level.title}
            </span>
            <span
              className={`text-xs hidden sm:inline-flex items-center gap-1 shrink-0 ${
                isTreble ? 'text-amber-400/90' : 'text-sky-400/90'
              }`}
            >
              <span className="font-serif text-base leading-none">
                {isTreble ? '𝄞' : '𝄢'}
              </span>
              <span>Clé de {isTreble ? 'Sol' : 'Fa'}</span>
            </span>
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
            title="Recommencer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recommencer</span>
          </button>
        </div>
      </header>

      {/* Main Minimalist Practice Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
        {/* Immediate Next-Level Proposal Banner when completed */}
        {isCompleted && (
          <div className="py-4 px-5 bg-slate-900/90 border-l-2 border-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Leçon terminée</span>
              </div>
              {nextLevel ? (
                <p className="text-sm text-slate-200">
                  Prochaine étape proposée :{' '}
                  <strong className="font-semibold text-white">{nextLevel.title}</strong>{' '}
                  <span className="text-xs text-slate-400">
                    ({nextLevel.difficulty} · Clé de {nextLevel.clef === 'treble' ? 'Sol' : 'Fa'})
                  </span>
                </p>
              ) : (
                <p className="text-sm text-slate-200">
                  Vous avez terminé la dernière leçon du parcours !
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={onReset}
                className="text-xs text-slate-400 hover:text-slate-100 transition-colors cursor-pointer py-2 px-2"
              >
                Rejouer
              </button>

              {nextLevel ? (
                <button
                  onClick={() => onSelectNextLevel(nextLevel)}
                  className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs px-4 py-2.5 transition-colors cursor-pointer"
                >
                  <span>Niveau suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onBackToHub}
                  className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs px-4 py-2.5 transition-colors cursor-pointer"
                >
                  <span>Retour aux leçons</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clean Music Sheet Strip */}
        <StaffView
          notes={level.notes}
          currentIndex={currentIndex}
          clef={level.clef}
          lastMismatch={lastMismatch}
        />

        {/* Flat Pitch & Microphone Strip */}
        <AcousticTuner
          isListening={isListening}
          onToggleListening={onToggleListening}
          onResumeAudio={onResumeAudio}
          currentPitch={currentPitch}
          targetPitch={targetNote.solfegePitch}
          onSetSensitivity={onSetSensitivity}
          onSetGain={onSetGain}
        />
      </main>
    </div>
  );
};
