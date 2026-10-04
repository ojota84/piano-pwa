import React, { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, Check, ChevronRight } from 'lucide-react';
import { PartitionPiece } from '../../core/models/music.types.ts';
import { PitchResult, LevelGradeSummary } from '../../core/models/pitch.types.ts';
import { getNoteDurationLabel } from '../../core/theory/musicTheory.ts';
import { StaffView } from './StaffView.tsx';
import { AcousticTuner } from './AcousticTuner.tsx';

interface FocusTrainingViewProps {
  level: PartitionPiece;
  nextLevel: PartitionPiece | null;
  currentIndex: number;
  accuracy: number;
  elapsedSeconds: number;
  isCompleted: boolean;
  hasPerformanceStarted: boolean;
  tempoBpm: number;
  gradeSummary: LevelGradeSummary;
  isListening: boolean;
  currentPitch: PitchResult | null;
  lastMismatch: boolean;
  onBackToHub: () => void;
  onReset: () => void;
  onSelectNextLevel: (nextLevel: PartitionPiece) => void;
  onSetTempoBpm: (bpm: number) => void;
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
  hasPerformanceStarted,
  tempoBpm,
  gradeSummary,
  isListening,
  currentPitch,
  lastMismatch,
  onBackToHub,
  onReset,
  onSelectNextLevel,
  onSetTempoBpm,
  onToggleListening,
  onResumeAudio,
  onSetSensitivity,
  onSetGain,
}) => {
  const targetNote = level.notes[currentIndex] || level.notes[0];
  const isTreble = level.clef === 'treble';

  const [rhythmPulseActive, setRhythmPulseActive] = useState<boolean>(true);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [tickFlash, setTickFlash] = useState<boolean>(false);

  const beatsPerMeasure = level.timeSignature[0] || 4;

  // Reset beat on level change
  useEffect(() => {
    setCurrentBeat(1);
  }, [level.id]);

  // Continuous Silent Visual Tick (respects Acoustic Anti-Feedback Rule)
  useEffect(() => {
    if (!rhythmPulseActive || isCompleted) return;
    const intervalMs = Math.round(60000 / Math.max(30, Math.min(200, tempoBpm)));
    const timer = setInterval(() => {
      setCurrentBeat((prev) => (prev % beatsPerMeasure) + 1);
      setTickFlash(true);
      setTimeout(() => setTickFlash(false), 120);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [rhythmPulseActive, isCompleted, tempoBpm, beatsPerMeasure]);

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
        {/* End-of-Level Grading & Next-Level Proposal */}
        {isCompleted && (
          <div className="py-5 px-5 bg-slate-900/90 border-l-2 border-emerald-400 flex flex-col gap-4">
            {/* Top row: Grade Summary + Primary Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {gradeSummary.gradeLabel} · {gradeSummary.overallScorePercent}%
                    </span>
                  </span>
                  <span className="text-slate-700">·</span>
                  <span className="text-xs text-slate-300 tabular-nums">
                    Notes justes :{' '}
                    <strong className="text-white">
                      {gradeSummary.correctPitchNotesCount}/{gradeSummary.totalNotes}
                    </strong>{' '}
                    ({gradeSummary.pitchScorePercent}%)
                  </span>
                  <span className="text-slate-700">·</span>
                  <span className="text-xs text-slate-300 tabular-nums">
                    En rythme :{' '}
                    <strong className="text-white">
                      {gradeSummary.onTimeRhythmNotesCount}/{gradeSummary.totalNotes}
                    </strong>{' '}
                    ({gradeSummary.rhythmScorePercent}%)
                  </span>
                </div>

                {nextLevel ? (
                  <p className="text-xs text-slate-400">
                    Prochaine leçon proposée :{' '}
                    <strong className="text-slate-200">{nextLevel.title}</strong> ({nextLevel.difficulty})
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Dernière leçon du parcours complétée.
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

            {/* Per-Note Breakdown Strip (Pitch & Rhythm per note) */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {gradeSummary.noteRecords.map((rec) => {
                const pitchOk = rec.pitchCorrectFirstTry;
                const rhythmOk = rec.rhythmStatus === 'on_time';
                const rhythmLabel =
                  rec.rhythmStatus === 'on_time'
                    ? 'rythme ✓'
                    : rec.rhythmStatus === 'early'
                    ? 'trop tôt'
                    : 'trop tard';

                return (
                  <div
                    key={rec.noteId}
                    className="flex items-center gap-1.5 font-mono text-[11px]"
                  >
                    <span className="text-slate-500">
                      {String(rec.noteIndex + 1).padStart(2, '0')}.
                    </span>
                    <span className={pitchOk ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {rec.solfegePitch}
                    </span>
                    <span className={rhythmOk ? 'text-slate-400' : 'text-amber-400'}>
                      ({pitchOk ? '' : 'erreur, '}{rhythmLabel})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Minimalist Rhythm Tick & Evaluation Trigger Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pb-1">
          <div className="flex items-center gap-3">
            {!isCompleted && (
              <span className={hasPerformanceStarted ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                {hasPerformanceStarted
                  ? `Évaluation en cours (${currentIndex}/${level.notes.length})`
                  : `Jouez la 1ère note (${level.notes[0]?.solfegePitch}) pour lancer l'évaluation`}
              </span>
            )}
            <span className="text-slate-800">·</span>
            <span>
              Rythme attendu :{' '}
              <strong className="text-amber-400 font-medium">
                {getNoteDurationLabel(targetNote.duration)}
              </strong>
            </span>
          </div>

          {/* Continuous Visual Tick & Tempo Control */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2" title="Pulsation visuelle continue">
              <span
                className={`w-2 h-2 rounded-full transition-opacity duration-75 ${
                  rhythmPulseActive && tickFlash
                    ? currentBeat === 1
                      ? 'bg-amber-400 opacity-100'
                      : 'bg-emerald-400 opacity-100'
                    : 'bg-slate-700 opacity-40'
                }`}
              />
              {Array.from({ length: beatsPerMeasure }, (_, idx) => {
                const beatNum = idx + 1;
                const isActiveBeat = rhythmPulseActive && currentBeat === beatNum;
                return (
                  <span
                    key={beatNum}
                    className={`w-4 text-center font-mono text-[11px] transition-colors ${
                      isActiveBeat
                        ? beatNum === 1
                          ? 'text-amber-400 font-bold underline underline-offset-4'
                          : 'text-emerald-400 font-bold underline underline-offset-4'
                        : 'text-slate-600'
                    }`}
                  >
                    {beatNum}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <button
                onClick={() => onSetTempoBpm(Math.max(40, tempoBpm - 5))}
                className="text-slate-500 hover:text-slate-200 px-1 cursor-pointer"
                title="Ralentir le tempo"
              >
                −
              </button>
              <button
                onClick={() => setRhythmPulseActive((a) => !a)}
                className={`cursor-pointer transition-colors tabular-nums ${
                  rhythmPulseActive ? 'text-slate-300' : 'text-slate-600 line-through'
                }`}
                title="Activer/Désactiver le tick visuel"
              >
                {tempoBpm} BPM
              </button>
              <button
                onClick={() => onSetTempoBpm(Math.min(160, tempoBpm + 5))}
                className="text-slate-500 hover:text-slate-200 px-1 cursor-pointer"
                title="Accélérer le tempo"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Clean Music Sheet Strip */}
        <StaffView
          notes={level.notes}
          currentIndex={currentIndex}
          clef={level.clef}
          timeSignature={level.timeSignature}
          noteRecords={gradeSummary.noteRecords}
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
