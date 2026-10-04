import React, { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, Check, ChevronRight } from 'lucide-react';
import { PartitionPiece, LessonMode } from '../../core/models/music.types.ts';
import { PitchResult, LevelGradeSummary } from '../../core/models/pitch.types.ts';
import { getNoteDurationLabel } from '../../core/theory/musicTheory.ts';
import { StaffView } from './StaffView.tsx';
import { AcousticTuner } from './AcousticTuner.tsx';

interface FocusTrainingViewProps {
  readonly runId: number;
  readonly level: PartitionPiece;
  readonly nextLevel: PartitionPiece | null;
  readonly currentIndex: number;
  readonly accuracy: number;
  readonly elapsedSeconds: number;
  readonly isCompleted: boolean;
  readonly hasPerformanceStarted: boolean;
  readonly lastMatchTimeMs: number;
  readonly expectedIntervalMs: number;
  readonly tempoBpm: number;
  readonly gradeSummary: Readonly<LevelGradeSummary>;
  readonly isListening: boolean;
  readonly currentPitch: PitchResult | null;
  readonly lastMismatch: boolean;
  readonly onBackToHub: () => void;
  readonly onReset: () => void;
  readonly onSelectNextLevel: (nextLevel: PartitionPiece) => void;
  readonly onSetTempoBpm: (bpm: number) => void;
  readonly onToggleListening: () => void;
  readonly onResumeAudio: () => void;
  readonly onSetSensitivity: (val: number) => void;
  readonly onSetGain: (val: number) => void;
}

export const FocusTrainingView: React.FC<FocusTrainingViewProps> = ({
  runId,
  level,
  nextLevel,
  currentIndex,
  elapsedSeconds,
  isCompleted,
  hasPerformanceStarted,
  lastMatchTimeMs,
  expectedIntervalMs,
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

  const [activeMode, setActiveMode] = useState<LessonMode>(() => level.mode || 'lecture');
  const [rhythmPulseActive, setRhythmPulseActive] = useState<boolean>(true);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [preStartBeatProgress, setPreStartBeatProgress] = useState<number>(0);
  const [beatProgress, setBeatProgress] = useState<number>(0);
  const [liveStopwatchSec, setLiveStopwatchSec] = useState<number>(0);

  const isRhythmMode = activeMode === 'rythme';
  const beatsPerMeasure = level.timeSignature[0] || 4;

  // Smooth 30ms animation loop driving the Beat Ring on the Active Note & Stopwatch
  useEffect(() => {
    if (isCompleted) return;

    const beatDurationMs = 60000 / Math.max(30, Math.min(200, tempoBpm));
    const loopOriginMs = hasPerformanceStarted && lastMatchTimeMs > 0 ? lastMatchTimeMs : Date.now();
    const startStopwatchAnchorMs = Date.now() - elapsedSeconds * 1000;

    const interval = setInterval(() => {
      const now = Date.now();

      // 1. Pre-start & continuous beat ring sweep (for Note 1 & measure beat counter)
      if (isRhythmMode && rhythmPulseActive) {
        const elapsedFromOrigin = Math.max(0, now - loopOriginMs);
        const totalBeatsElapsed = elapsedFromOrigin / beatDurationMs;
        const beatInMeasure = (Math.floor(totalBeatsElapsed) % beatsPerMeasure) + 1;
        const withinBeatFraction = totalBeatsElapsed - Math.floor(totalBeatsElapsed);

        setCurrentBeat(beatInMeasure);
        setPreStartBeatProgress(withinBeatFraction);
      } else {
        setPreStartBeatProgress(0);
      }

      // 2. Post-Note-1 Stopwatch & Per-Note Beat Ring Progress
      if (hasPerformanceStarted && lastMatchTimeMs > 0) {
        setLiveStopwatchSec(Math.max(0, Math.floor((now - startStopwatchAnchorMs) / 1000)));
        if (expectedIntervalMs > 0) {
          setBeatProgress((now - lastMatchTimeMs) / expectedIntervalMs);
        } else {
          setBeatProgress(0);
        }
      } else {
        setLiveStopwatchSec(0);
        setBeatProgress(0);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [
    isCompleted,
    isRhythmMode,
    rhythmPulseActive,
    tempoBpm,
    beatsPerMeasure,
    hasPerformanceStarted,
    lastMatchTimeMs,
    expectedIntervalMs,
    elapsedSeconds,
    runId,
  ]);

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

  const displayedSeconds = isCompleted
    ? elapsedSeconds
    : hasPerformanceStarted
    ? liveStopwatchSec
    : 0;

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

          {/* Center: Title + Mode Toggle + Clef */}
          <div className="flex items-center gap-3 min-w-0 truncate">
            <span className="text-sm sm:text-base font-medium text-slate-100 truncate">
              {level.title}
            </span>

            <span className="hidden sm:inline text-slate-800">·</span>

            <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
              <button
                onClick={() => setActiveMode('lecture')}
                className={`cursor-pointer transition-colors ${
                  !isRhythmMode ? 'text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Lecture
              </button>
              <span className="text-slate-800">/</span>
              <button
                onClick={() => setActiveMode('rythme')}
                className={`cursor-pointer transition-colors ${
                  isRhythmMode ? 'text-amber-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Rythme
              </button>
            </div>

            <span
              className={`text-xs hidden md:inline-flex items-center gap-1 shrink-0 ${
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {isRhythmMode
                        ? `${gradeSummary.gradeLabel} · ${gradeSummary.overallScorePercent}%`
                        : `Lecture terminée · ${gradeSummary.pitchScorePercent}%`}
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
                  {isRhythmMode && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-300 tabular-nums">
                        En rythme :{' '}
                        <strong className="text-white">
                          {gradeSummary.onTimeRhythmNotesCount}/{gradeSummary.totalNotes}
                        </strong>{' '}
                        ({gradeSummary.rhythmScorePercent}%)
                      </span>
                    </>
                  )}
                  <span className="text-slate-700">·</span>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {displayedSeconds}s
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

            {/* Per-Note Breakdown Strip */}
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
                    {isRhythmMode ? (
                      <span className={rhythmOk ? 'text-slate-400' : 'text-amber-400'}>
                        ({pitchOk ? '' : 'erreur, '}{rhythmLabel})
                      </span>
                    ) : (
                      !pitchOk && <span className="text-rose-400">(erreur)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status & Stopwatch / Beat Ring Instruction Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            {!isCompleted && (
              <span className={hasPerformanceStarted ? 'text-emerald-400 font-medium' : 'text-slate-300'}>
                {hasPerformanceStarted
                  ? `Note ${currentIndex + 1}/${level.notes.length} · ⏱ ${displayedSeconds}s`
                  : isRhythmMode
                  ? `Jouez la 1ère note (${level.notes[0]?.solfegePitch}) quand l'anneau sur la note passe au vert`
                  : `Jouez la 1ère note (${level.notes[0]?.solfegePitch}) pour démarrer le chrono`}
              </span>
            )}

            {isRhythmMode && !isCompleted && (
              <>
                <span className="text-slate-800">·</span>
                <span>
                  Valeur :{' '}
                  <strong className="text-amber-400 font-medium">
                    {getNoteDurationLabel(targetNote.duration)}
                  </strong>
                </span>
              </>
            )}
          </div>

          {/* Right: Tempo BPM Control in Rhythm mode */}
          {isRhythmMode ? (
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
                title="Activer/Désactiver l'anneau de pulsation"
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
          ) : (
            <span className="text-slate-500">
              Mode Lecture · Sans contrainte de rythme
            </span>
          )}
        </div>

        {/* Clean Music Sheet Strip with Beat Ring directly on the Active Note */}
        <StaffView
          notes={level.notes}
          currentIndex={currentIndex}
          clef={level.clef}
          mode={activeMode}
          timeSignature={level.timeSignature}
          noteRecords={gradeSummary.noteRecords}
          beatProgress={isRhythmMode && hasPerformanceStarted ? beatProgress : 0}
          preStartBeatProgress={isRhythmMode && !hasPerformanceStarted ? preStartBeatProgress : 0}
          currentBeat={currentBeat}
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
