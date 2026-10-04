import React, { useRef, useEffect } from 'react';
import { MusicalNote, ClefType, LessonMode } from '../../core/models/music.types.ts';
import { NotePerformanceRecord } from '../../core/models/pitch.types.ts';
import {
  getDiatonicStaffPosition,
  computeMeasureBarLineIndices,
  getNoteDurationBeats,
} from '../../core/theory/musicTheory.ts';

export interface StaffViewProps {
  readonly notes: readonly MusicalNote[];
  readonly currentIndex: number;
  readonly clef: ClefType;
  readonly mode?: LessonMode;
  readonly timeSignature?: readonly [number, number];
  readonly noteRecords?: readonly NotePerformanceRecord[];
  readonly beatProgress?: number;     // 0.0 to 1.0+ progress toward the strike moment of the active note
  readonly preStartBeatProgress?: number; // 0.0 to 1.0 beat sweep on Note 1 before performance starts
  readonly currentBeat?: number;      // 1..beatsPerMeasure
  readonly lastMismatch: boolean;
}

const STAFF_LINE_YS: readonly number[] = Object.freeze([84, 104, 124, 144, 164]);
const CENTER_Y = 124;
const STEP_HEIGHT = 10;
const START_X = 135;
const NOTE_SPACING = 76;
const SVG_HEIGHT = 276;

/**
 * Pure higher-order generator for ledger lines above and below the 5-line pentagram.
 */
function computeLedgerLineYs(staffPos: number): Readonly<{
  below: readonly number[];
  above: readonly number[];
}> {
  const belowCount = staffPos <= -6 ? Math.floor((-6 - staffPos) / 2) + 1 : 0;
  const aboveCount = staffPos >= 6 ? Math.floor((staffPos - 6) / 2) + 1 : 0;

  return Object.freeze({
    below: Object.freeze(
      Array.from({ length: belowCount }, (_, idx) => CENTER_Y - (-6 - idx * 2) * STEP_HEIGHT)
    ),
    above: Object.freeze(
      Array.from({ length: aboveCount }, (_, idx) => CENTER_Y - (6 + idx * 2) * STEP_HEIGHT)
    ),
  });
}

/**
 * Pure helper computing the rhythm action cue displayed above the active notehead.
 */
function resolveRhythmCueText(
  isRhythmMode: boolean,
  currentIndex: number,
  inStrikeZone: boolean,
  isLate: boolean,
  currentBeat: number,
  clampedProgress: number,
  previousNote?: MusicalNote
): string {
  if (!isRhythmMode) return '';

  if (currentIndex === 0) {
    return inStrikeZone ? `● Temps ${currentBeat}` : `Temps ${currentBeat}`;
  }

  if (inStrikeZone) return 'JOUEZ !';
  if (isLate) return 'Trop tard';

  const prevBeats = previousNote ? getNoteDurationBeats(previousNote.duration) : 1;
  if (prevBeats >= 2) {
    const currentHoldBeat = Math.min(
      prevBeats,
      Math.floor(clampedProgress * prevBeats) + 1
    );
    return `Tenez ${currentHoldBeat}/${prevBeats}`;
  }

  return 'Tenez...';
}

export const StaffView: React.FC<StaffViewProps> = ({
  notes,
  currentIndex,
  clef,
  mode = 'lecture',
  timeSignature = [4, 4],
  noteRecords = [],
  beatProgress = 0,
  preStartBeatProgress = 0,
  currentBeat = 1,
  lastMismatch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isRhythmMode = mode === 'rythme';
  const svgWidth = Math.max(540, START_X + notes.length * NOTE_SPACING + 60);
  const measureBarIndices = computeMeasureBarLineIndices(notes, timeSignature);

  // Auto-center the partition viewport around the active note being played
  useEffect(() => {
    const centerActiveNote = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const svg = container.querySelector('svg');
      if (!svg) return;

      const currentNoteX = START_X + currentIndex * NOTE_SPACING;
      const svgRect = svg.getBoundingClientRect();
      const scale = svgRect.width / svgWidth;

      const notePixelX = currentNoteX * scale;
      const containerVisibleWidth = container.clientWidth;
      const scrollTarget = notePixelX - containerVisibleWidth / 2;

      container.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: 'smooth',
      });
    };

    centerActiveNote();
    const rafId = requestAnimationFrame(centerActiveNote);
    window.addEventListener('resize', centerActiveNote);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', centerActiveNote);
    };
  }, [currentIndex, notes.length, svgWidth]);

  return (
    <div className="w-full bg-white select-none overflow-hidden">
      <div
        ref={containerRef}
        className="w-full overflow-x-auto py-2 px-2 scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
          className="w-full h-60 sm:h-68"
          style={{ minWidth: `${svgWidth}px` }}
        >
          <rect x="0" y="0" width={svgWidth} height={SVG_HEIGHT} fill="#ffffff" />

          {/* 5 Pentagram Staff Lines */}
          {STAFF_LINE_YS.map((y, idx) => (
            <line
              key={`line-${idx}`}
              x1="20"
              y1={y}
              x2={svgWidth - 20}
              y2={y}
              stroke="#0f172a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}

          {/* Start Bar Line & Final Double Bar Line */}
          <line x1="20" y1="84" x2="20" y2="164" stroke="#0f172a" strokeWidth="2.5" />
          <line x1={svgWidth - 25} y1="84" x2={svgWidth - 25} y2="164" stroke="#0f172a" strokeWidth="1.5" />
          <line x1={svgWidth - 20} y1="84" x2={svgWidth - 20} y2="164" stroke="#0f172a" strokeWidth="3.5" />

          {/* Clef Glyphs */}
          {clef === 'treble' ? (
            <text
              x="32"
              y="160"
              fontFamily="serif"
              fontSize="84"
              fill="#0f172a"
              className="select-none"
            >
              𝄞
            </text>
          ) : (
            <text
              x="30"
              y="146"
              fontFamily="serif"
              fontSize="66"
              fill="#0f172a"
              className="select-none"
            >
              𝄢
            </text>
          )}

          {/* Dynamic Time Signature */}
          <g transform="translate(95, 0)">
            <text x="0" y="119" fontSize="28" fontFamily="serif" fontWeight="700" fill="#0f172a" textAnchor="middle">
              {timeSignature[0]}
            </text>
            <text x="0" y="159" fontSize="28" fontFamily="serif" fontWeight="700" fill="#0f172a" textAnchor="middle">
              {timeSignature[1]}
            </text>
          </g>

          {/* Measure Bar Lines */}
          {measureBarIndices.map((noteIdx) => {
            const barX = START_X + noteIdx * NOTE_SPACING + NOTE_SPACING / 2;
            return (
              <line
                key={`bar-${noteIdx}`}
                x1={barX}
                y1="84"
                x2={barX}
                y2="164"
                stroke="#64748b"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Notes on the Pentagram */}
          {notes.map((note, index) => {
            const staffPos = getDiatonicStaffPosition(note.step, note.octave, clef);
            const x = START_X + index * NOTE_SPACING;
            const y = CENTER_Y - staffPos * STEP_HEIGHT;

            const isTarget = index === currentIndex;
            const isCompleted = index < currentIndex;
            const record = noteRecords[index];
            const ledgerLines = computeLedgerLineYs(staffPos);

            const activeSweep = currentIndex === 0 ? preStartBeatProgress : beatProgress;
            const inStrikeZone =
              isRhythmMode &&
              (currentIndex === 0
                ? preStartBeatProgress >= 0.82 || preStartBeatProgress <= 0.22
                : beatProgress >= 0.65 && beatProgress <= 1.35);
            const isLate = isRhythmMode && currentIndex > 0 && beatProgress > 1.35;

            const isCleanCompleted = isRhythmMode
              ? !record || (record.pitchCorrectFirstTry && record.rhythmStatus === 'on_time')
              : !record || record.pitchCorrectFirstTry;

            const noteColor = isCompleted
              ? isCleanCompleted
                ? '#059669'
                : '#d97706'
              : isTarget
              ? lastMismatch
                ? '#dc2626'
                : inStrikeZone
                ? '#059669'
                : '#d97706'
              : '#1e293b';

            const labelColor = isCompleted
              ? isCleanCompleted
                ? '#059669'
                : '#b45309'
              : isTarget
              ? lastMismatch
                ? '#dc2626'
                : inStrikeZone
                ? '#059669'
                : '#b45309'
              : '#64748b';

            const ringRadius = 24;
            const ringCircumference = 2 * Math.PI * ringRadius;
            const clampedProgress = Math.min(1, Math.max(0, activeSweep));
            const rhythmCueText = isTarget
              ? resolveRhythmCueText(
                  isRhythmMode,
                  currentIndex,
                  inStrikeZone,
                  isLate,
                  currentBeat,
                  clampedProgress,
                  currentIndex > 0 ? notes[currentIndex - 1] : undefined
                )
              : '';

            const stemUp = y > CENTER_Y;
            const stemX = stemUp ? x + 9.5 : x - 9.5;
            const stemY2 = stemUp ? y - 44 : y + 44;

            const beats = getNoteDurationBeats(note.duration);
            const baseBeatText = beats === 0.5 ? '½t' : `${beats}t`;
            const beatText =
              isCompleted && record
                ? record.rhythmStatus === 'on_time'
                  ? `${baseBeatText} ✓`
                  : record.rhythmStatus === 'early'
                  ? `${baseBeatText} tôt`
                  : `${baseBeatText} tard`
                : baseBeatText;

            return (
              <g key={note.id}>
                {isTarget && (
                  <g>
                    <circle
                      cx={x}
                      cy={y}
                      r={isRhythmMode ? '21' : '20'}
                      fill={
                        lastMismatch
                          ? '#fee2e2'
                          : inStrikeZone
                          ? '#d1fae5'
                          : '#fef3c7'
                      }
                      opacity="0.9"
                    />

                    {isRhythmMode && (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={ringRadius}
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="5"
                        />
                        {currentIndex > 0 && (
                          <circle
                            cx={x}
                            cy={y}
                            r={ringRadius}
                            fill="none"
                            stroke="#a7f3d0"
                            strokeWidth="5"
                            strokeDasharray={`${ringCircumference * 0.35} ${ringCircumference * 0.65}`}
                            strokeDashoffset={-ringCircumference * 0.65}
                            transform={`rotate(-90 ${x} ${y})`}
                          />
                        )}
                        <circle
                          cx={x}
                          cy={y}
                          r={ringRadius}
                          fill="none"
                          stroke={
                            lastMismatch
                              ? '#dc2626'
                              : inStrikeZone
                              ? '#059669'
                              : isLate
                              ? '#f43f5e'
                              : '#f59e0b'
                          }
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringCircumference * (1 - clampedProgress)}
                          transform={`rotate(-90 ${x} ${y})`}
                        />
                        <text
                          x={x}
                          y={Math.min(34, y - 32)}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="800"
                          fill={
                            inStrikeZone
                              ? '#059669'
                              : isLate
                              ? '#e11d48'
                              : '#d97706'
                          }
                          className="font-sans select-none"
                        >
                          {rhythmCueText}
                        </text>
                      </>
                    )}
                  </g>
                )}

                {ledgerLines.below.map((ly, lIdx) => (
                  <line
                    key={`ledger-below-${lIdx}`}
                    x1={x - 16}
                    y1={ly}
                    x2={x + 16}
                    y2={ly}
                    stroke={noteColor}
                    strokeWidth="2"
                  />
                ))}

                {ledgerLines.above.map((ly, lIdx) => (
                  <line
                    key={`ledger-above-${lIdx}`}
                    x1={x - 16}
                    y1={ly}
                    x2={x + 16}
                    y2={ly}
                    stroke={noteColor}
                    strokeWidth="2"
                  />
                ))}

                {note.duration !== 'whole' && (
                  <line
                    x1={stemX}
                    y1={y}
                    x2={stemX}
                    y2={stemY2}
                    stroke={noteColor}
                    strokeWidth="2.2"
                  />
                )}

                {note.duration === 'eighth' && (
                  <path
                    d={
                      stemUp
                        ? `M ${stemX} ${stemY2} C ${stemX + 10} ${stemY2 + 8}, ${stemX + 12} ${stemY2 + 18}, ${stemX + 6} ${stemY2 + 26}`
                        : `M ${stemX} ${stemY2} C ${stemX + 10} ${stemY2 - 8}, ${stemX + 12} ${stemY2 - 18}, ${stemX + 6} ${stemY2 - 26}`
                    }
                    fill="none"
                    stroke={noteColor}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                )}

                <ellipse
                  cx={x}
                  cy={y}
                  rx="10.5"
                  ry="8"
                  transform={`rotate(-25 ${x} ${y})`}
                  fill={note.duration === 'half' || note.duration === 'whole' ? '#ffffff' : noteColor}
                  stroke={noteColor}
                  strokeWidth="2.4"
                />

                <text
                  x={x}
                  y={isRhythmMode ? 244 : 250}
                  textAnchor="middle"
                  fontSize={isTarget ? '15' : '13'}
                  fontWeight={isTarget ? '700' : '500'}
                  fill={labelColor}
                  className="font-sans select-none"
                >
                  {note.solfegePitch}
                </text>

                {isRhythmMode && (
                  <text
                    x={x}
                    y={260}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill={
                      isCompleted && record
                        ? record.rhythmStatus === 'on_time'
                          ? '#059669'
                          : '#d97706'
                        : isTarget
                        ? labelColor
                        : '#94a3b8'
                    }
                    className="font-mono select-none"
                  >
                    {beatText}
                  </text>
                )}

                {note.finger && !isRhythmMode && (
                  <text
                    x={x}
                    y={22}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill={isTarget ? '#b45309' : '#94a3b8'}
                  >
                    {note.finger}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
