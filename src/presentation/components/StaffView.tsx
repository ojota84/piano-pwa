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
  readonly beatProgress?: number; // 0.0 to 1.0+ hold progress of the note just played (notes[currentIndex - 1])
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
 * Pure helper computing the Hold Clock label shown on the note currently being held.
 */
function resolveHoldCueText(
  note: MusicalNote,
  clampedHoldProgress: number
): string {
  const beats = getNoteDurationBeats(note.duration);
  if (beats >= 2) {
    const currentHoldBeat = Math.min(
      beats,
      Math.floor(clampedHoldProgress * beats) + 1
    );
    return `Tenez ${currentHoldBeat}/${beats}`;
  }
  if (beats === 0.5) {
    return 'Tenez ½t';
  }
  return 'Tenez 1t';
}

const StaffViewComponent: React.FC<StaffViewProps> = ({
  notes,
  currentIndex,
  clef,
  mode = 'lecture',
  timeSignature = [4, 4],
  noteRecords = [],
  beatProgress = 1,
  lastMismatch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isRhythmMode = mode === 'rythme';
  const svgWidth = Math.max(540, START_X + notes.length * NOTE_SPACING + 60);
  const measureBarIndices = computeMeasureBarLineIndices(notes, timeSignature);

  // In Rhythm mode, right after striking notes[currentIndex - 1], we hold that note
  // while its Hold Clock fills from 0.0 -> 1.0 over its own duration.
  // Once beatProgress >= 1.0 (or on Note 1 at index 0), the green "JOUEZ !" spotlight is on notes[currentIndex].
  const isHoldingPreviousNote =
    isRhythmMode &&
    currentIndex > 0 &&
    currentIndex <= notes.length &&
    beatProgress < 1.0;

  const visualFocusIndex = isHoldingPreviousNote ? currentIndex - 1 : currentIndex;

  // Auto-center the partition viewport around the visually active note
  useEffect(() => {
    const centerActiveNote = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const svg = container.querySelector('svg');
      if (!svg) return;

      const currentNoteX = START_X + visualFocusIndex * NOTE_SPACING;
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
  }, [visualFocusIndex, notes.length, svgWidth]);

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

            // Is this note currently being held while its duration ring fills up?
            const isBeingHeld = isHoldingPreviousNote && index === currentIndex - 1;
            // Is this note ready to be struck right now ("JOUEZ !")?
            const isReadyToStrike = !isHoldingPreviousNote && index === currentIndex;
            // While holding note[currentIndex - 1], note[currentIndex] is shown as upcoming ("Suivante")
            const isNextPreview = isHoldingPreviousNote && index === currentIndex;

            const isCompleted = isHoldingPreviousNote
              ? index < currentIndex - 1
              : index < currentIndex;

            const record = noteRecords[index];
            const ledgerLines = computeLedgerLineYs(staffPos);

            const isCleanCompleted = isRhythmMode
              ? !record || (record.pitchCorrectFirstTry && record.rhythmStatus === 'on_time')
              : !record || record.pitchCorrectFirstTry;

            // Only show red mismatch if the user already started the piece and struck a wrong key
            const showMismatchRed = isReadyToStrike && lastMismatch && currentIndex > 0;

            const noteColor = isCompleted
              ? isCleanCompleted
                ? '#059669'
                : '#d97706'
              : isBeingHeld
              ? '#0284c7'
              : isReadyToStrike
              ? showMismatchRed
                ? '#dc2626'
                : '#059669'
              : isNextPreview
              ? '#d97706'
              : '#1e293b';

            const labelColor = isCompleted
              ? isCleanCompleted
                ? '#059669'
                : '#b45309'
              : isBeingHeld
              ? '#0284c7'
              : isReadyToStrike
              ? showMismatchRed
                ? '#dc2626'
                : '#059669'
              : isNextPreview
              ? '#d97706'
              : '#64748b';

            const ringRadius = 24;
            const ringCircumference = 2 * Math.PI * ringRadius;
            const clampedHoldProgress = Math.min(1, Math.max(0, beatProgress));

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
                {/* 1. HOLDING STATE: Clock ring fills on the note you JUST played for THAT note's duration */}
                {isBeingHeld && (
                  <g>
                    <circle
                      cx={x}
                      cy={y}
                      r="21"
                      fill="#e0f2fe"
                      opacity="0.95"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={ringRadius}
                      fill="none"
                      stroke="#bae6fd"
                      strokeWidth="5"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={ringRadius}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference * (1 - clampedHoldProgress)}
                      transform={`rotate(-90 ${x} ${y})`}
                    />
                    <text
                      x={x}
                      y={Math.min(34, y - 32)}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="800"
                      fill="#0284c7"
                      className="font-sans select-none"
                    >
                      {resolveHoldCueText(note, clampedHoldProgress)}
                    </text>
                  </g>
                )}

                {/* 2. READY TO STRIKE STATE: Steady green spotlight ("JOUEZ !") with NO running clock */}
                {isReadyToStrike && (
                  <g>
                    <circle
                      cx={x}
                      cy={y}
                      r={isRhythmMode ? '21' : '20'}
                      fill={showMismatchRed ? '#fee2e2' : '#d1fae5'}
                      opacity="0.95"
                    />
                    {isRhythmMode && (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={ringRadius}
                          fill="none"
                          stroke={showMismatchRed ? '#dc2626' : '#10b981'}
                          strokeWidth="4"
                        />
                        <text
                          x={x}
                          y={Math.min(34, y - 32)}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="800"
                          fill={showMismatchRed ? '#dc2626' : '#059669'}
                          className="font-sans select-none"
                        >
                          ▶ JOUEZ !
                        </text>
                      </>
                    )}
                  </g>
                )}

                {/* 3. NEXT PREVIEW STATE: Subtle preview on the upcoming note while holding the previous one */}
                {isNextPreview && (
                  <g>
                    <circle
                      cx={x}
                      cy={y}
                      r="20"
                      fill="#fef3c7"
                      opacity="0.6"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={ringRadius}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={x}
                      y={Math.min(34, y - 32)}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#d97706"
                      className="font-sans select-none"
                    >
                      Suivante
                    </text>
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
                  fontSize={isReadyToStrike || isBeingHeld ? '15' : '13'}
                  fontWeight={isReadyToStrike || isBeingHeld ? '700' : '500'}
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
                        : isBeingHeld
                        ? '#0284c7'
                        : isReadyToStrike
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
                    fill={isReadyToStrike ? '#059669' : '#94a3b8'}
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

export const StaffView = React.memo(StaffViewComponent);
