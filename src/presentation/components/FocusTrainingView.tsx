import React from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
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
  accuracy,
  elapsedSeconds,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Minimal Focus Header for Piano Desk */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-3 sm:px-4 py-2.5 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          {/* Back to Catalog button */}
          <button
            onClick={onBackToHub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Catalogue des Niveaux</span>
            <span className="sm:hidden">Niveaux</span>
          </button>

          {/* Level Title in Header */}
          <div className="flex items-center gap-2 text-center truncate">
            <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-xs font-black flex items-center justify-center border border-amber-500/30">
              {level.levelNumber}
            </span>
            <span className="font-extrabold text-sm sm:text-base text-white truncate">
              {level.title}
            </span>
          </div>

          {/* Stats & Restart */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
            <div className="hidden sm:flex flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Précision</span>
              <span className="font-bold text-emerald-400">{accuracy}%</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">Notes</span>
              <span className="font-bold text-amber-400">
                {currentIndex}/{level.notes.length}
              </span>
            </div>

            <button
              onClick={onReset}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Recommencer l'exercice"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Focus Practice Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4 justify-start">
        {/* Level Pedagogical Goal Bar */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 gap-3">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-medium hidden sm:inline">Objectif :</span>
            <span className="text-white font-semibold truncate">{level.learningFocus}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 shrink-0">
            <span>{elapsedSeconds}s</span>
          </div>
        </div>

        {/* Dynamic Auto-Centering Pentagram Staff */}
        <section className="flex flex-col gap-2">
          <StaffView
            notes={level.notes}
            currentIndex={currentIndex}
            clef={level.clef}
            lastMismatch={lastMismatch}
          />

          {/* Active Target Note Banner */}
          <div className="flex items-center justify-between text-xs px-2 py-1 bg-slate-900/80 border border-slate-800/80 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-pulse" />
              <span className="text-slate-300">
                Note à jouer :{' '}
                <strong className="text-amber-300 text-sm font-black font-mono">
                  {targetNote.solfegePitch}
                </strong>
                {targetNote.finger && (
                  <span className="ml-2 text-slate-400 text-[11px]">
                    (Doigt {targetNote.finger})
                  </span>
                )}
              </span>
            </div>

            <div className="text-slate-400 text-[11px] hidden sm:block">
              {level.clef === 'treble' ? 'Main Droite (Clé de Sol)' : 'Main Gauche (Clé de Fa)'}
            </div>
          </div>
        </section>

        {/* Acoustic Tuner & Microphone Controls */}
        <section>
          <AcousticTuner
            isListening={isListening}
            onToggleListening={onToggleListening}
            onResumeAudio={onResumeAudio}
            currentPitch={currentPitch}
            targetPitch={targetNote.solfegePitch}
            onSetSensitivity={onSetSensitivity}
            onSetGain={onSetGain}
          />
        </section>

        {/* Level Complete Celebration Modal */}
        {isCompleted && (
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border border-emerald-500/50 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 my-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
              <Trophy className="w-9 h-9" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-2">
              Niveau {level.levelNumber} Validé !
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Félicitations !
            </h2>

            <p className="text-sm text-slate-300 max-w-md mt-1 leading-relaxed">
              Vous avez déchiffré avec succès toutes les notes de{' '}
              <strong className="text-amber-400">{level.title}</strong> en {elapsedSeconds} secondes avec une précision de{' '}
              <strong className="text-emerald-400 font-bold">{accuracy}%</strong>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                onClick={onReset}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition-colors border border-slate-700"
              >
                Rejouer ce niveau
              </button>

              <button
                onClick={onBackToHub}
                className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-colors border border-slate-700"
              >
                Tous les Niveaux
              </button>

              {nextLevel && (
                <button
                  onClick={() => onSelectNextLevel(nextLevel)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20"
                >
                  <span>Passer au Niveau {nextLevel.levelNumber}</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
