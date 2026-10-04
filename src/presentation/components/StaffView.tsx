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

  // 5 Staff Lines centered at y = 124 to give room above for Beat Ring cue labels and below for Solfège:
  // Line 5 (Top): y = 84 (staffPos = +4)
  // Line 4: y = 104 (staffPos = +2)
  // Line 3 (Middle): y = 124 (staffPos = 0)
  // Line 2: y = 144 (staffPos = -2)
  // Line 1 (Bottom): y = 164 (staffPos = -4)
  const centerY = 124;
  const staffLineY = [84, 104, 124, 144, 164];
  const stepHeight = 10; // 10px per diatonic step

  const startX = 135;
  const noteSpacing = 76;
  const svgWidth = Math.max(540, startX + notes.length * noteSpacing + 60);
  const svgHeight = 276;

  const measureBarIndices = computeMeasureBarLineIndices(notes, timeSignature);

  // Auto-center the partition viewport around the active note being played
  useEffect(() => {
    const centerActiveNote = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const svg = container.querySelector('svg');
      if (!svg) return;

      const currentNoteX = startX + currentIndex * noteSpacing;
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
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-60 sm:h-68"
          style={{ minWidth: `${svgWidth}px` }}
        >
          <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="#ffffff" />

          {/* 5 Pentagram Staff Lines */}
          {staffLineY.map((y, idx) => (
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

          {/* Dynamic Time Signature (e.g. 4/4 or 3/4) */}
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
            const barX = startX + noteIdx * noteSpacing + noteSpacing / 2;
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
            const x = startX + index * noteSpacing;
            const y = centerY - staffPos * stepHeight;

            const isTarget = index === currentIndex;
            const isCompleted = index < currentIndex;
            const record = noteRecords[index];

            const ledgerLinesBelow: number[] = [];
            if (staffPos <= -6) {
              for (let p = -6; p >= staffPos; p -= 2) {
                ledgerLinesBelow.push(centerY - p * stepHeight);
              }
            }

            const ledgerLinesAbove: number[] = [];
            if (staffPos >= 6) {
              for (let p = 6; p <= staffPos; p += 2) {
                ledgerLinesAbove.push(centerY - p * stepHeight);
              }
            }

            let noteColor = '#1e293b';
            let labelColor = '#64748b';
            let halo = null;

            if (isCompleted) {
              const isClean = isRhythmMode
                ? !record || (record.pitchCorrectFirstTry && record.rhythmStatus === 'on_time')
                : !record || record.pitchCorrectFirstTry;
              noteColor = isClean ? '#059669' : '#d97706';
              labelColor = isClean ? '#059669' : '#b45309';
            } else if (isTarget) {
              // Beat Ring logic directly on the active notehead:
              // - Before Note 1 (index === 0): sweeps 0..1 on every beat and flashes green at the beat impulse (0..0.25 or 0.85..1.0)
              // - On Note 2+ (index > 0): sweeps 0..1 over the previous note's duration and turns bright green in the strike window (0.65..1.35)
              const activeSweep = currentIndex === 0 ? preStartBeatProgress : beatProgress;
              const inStrikeZone =
                isRhythmMode &&
                (currentIndex === 0
                  ? preStartBeatProgress >= 0.82 || preStartBeatProgress <= 0.22
                  : beatProgress >= 0.65 && beatProgress <= 1.35);

              const isLate = isRhythmMode && currentIndex > 0 && beatProgress > 1.35;

              noteColor = lastMismatch
                ? '#dc2626'
                : inStrikeZone
                ? '#059669'
                : '#d97706';
              labelColor = lastMismatch
                ? '#dc2626'
                : inStrikeZone
                ? '#059669'
                : '#b45309';

              const ringRadius = 24;
              const ringCircumference = 2 * Math.PI * ringRadius;
              const clampedProgress = Math.min(1, Math.max(0, activeSweep));

              // Compute intuitive cue label directly above the active note on the partition
              let rhythmCueText = '';
              if (isRhythmMode) {
                if (currentIndex === 0) {
                  rhythmCueText = inStrikeZone ? `● Temps ${currentBeat}` : `Temps ${currentBeat}`;
                } else {
                  const prevNote = notes[currentIndex - 1];
                  const prevBeats = getNoteDurationBeats(prevNote.duration);
                  if (inStrikeZone) {
                    rhythmCueText = 'JOUEZ !';
                  } else if (isLate) {
                    rhythmCueText = 'Trop tard';
                  } else if (prevBeats >= 2) {
                    const currentHoldBeat = Math.min(
                      prevBeats,
                      Math.floor(clampedProgress * prevBeats) + 1
                    );
                    rhythmCueText = `Tenez ${currentHoldBeat}/${prevBeats}`;
                  } else {
                    rhythmCueText = 'Tenez...';
                  }
                }
              }

              halo = (
                <g>
                  {/* Inner Halo Fill */}
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

                  {/* Beat Ring Track & Animated Sweep directly on the Active Note */}
                  {isRhythmMode && (
                    <>
                      {/* Background track ring */}
                      <circle
                        cx={x}
                        cy={y}
                        r={ringRadius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="5"
                      />
                      {/* Green Target Strike Zone Arc (65% to 100% of the ring) */}
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
                      {/* Live Animated Beat Ring Progress */}
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
                      {/* Direct Action Cue Text right above the active note */}
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
              );
            }

            const stemUp = y > centerY;
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
                {halo}

                {ledgerLinesBelow.map((ly, lIdx) => (
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

                {ledgerLinesAbove.map((ly, lIdx) => (
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

                {/* Note Stem */}
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

                {/* Eighth-Note Flag (Croche) */}
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

                {/* Notehead (Hollow for Half & Whole, Filled for Quarter & Eighth) */}
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

                {/* Solfège Pitch Label */}
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

                {/* Rhythm Duration & Timing Indicator (only in Rythme mode) */}
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

                {/* Fingering hint (when not covered by rhythm cue) */}
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
