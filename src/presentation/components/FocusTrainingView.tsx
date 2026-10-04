import React from 'react';
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
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

        {/* Minimalist Completion Bar */}
        {isCompleted && (
          <div className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span className="text-base font-medium text-slate-100">
                Leçon terminée
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs">
              <button
                onClick={onReset}
                className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                Rejouer
              </button>

              <button
                onClick={onBackToHub}
                className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                Toutes les leçons
              </button>

              {nextLevel && (
                <button
                  onClick={() => onSelectNextLevel(nextLevel)}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
                >
                  <span>Suivant : {nextLevel.title}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
