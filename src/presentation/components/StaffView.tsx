import React, { useRef, useEffect } from 'react';
import { MusicalNote, ClefType } from '../../core/models/music.types.ts';
import {
  getDiatonicStaffPosition,
  computeMeasureBarLineIndices,
  getNoteDurationBeats,
} from '../../core/theory/musicTheory.ts';

export interface StaffViewProps {
  notes: MusicalNote[];
  currentIndex: number;
  clef: ClefType;
  timeSignature?: [number, number];
  lastMismatch: boolean;
}

export const StaffView: React.FC<StaffViewProps> = ({
  notes,
  currentIndex,
  clef,
  timeSignature = [4, 4],
  lastMismatch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 5 Staff Lines centered at y = 120 to accommodate wide spans (La 3 to Do 6):
  // Line 5 (Top): y = 80 (staffPos = +4)
  // Line 4: y = 100 (staffPos = +2)
  // Line 3 (Middle): y = 120 (staffPos = 0)
  // Line 2: y = 140 (staffPos = -2)
  // Line 1 (Bottom): y = 160 (staffPos = -4)
  const centerY = 120;
  const staffLineY = [80, 100, 120, 140, 160];
  const stepHeight = 10; // 10px per diatonic step

  const startX = 135;
  const noteSpacing = 74;
  const svgWidth = Math.max(540, startX + notes.length * noteSpacing + 60);
  const svgHeight = 268;

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
          className="w-full h-56 sm:h-64"
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
          <line x1="20" y1="80" x2="20" y2="160" stroke="#0f172a" strokeWidth="2.5" />
          <line x1={svgWidth - 25} y1="80" x2={svgWidth - 25} y2="160" stroke="#0f172a" strokeWidth="1.5" />
          <line x1={svgWidth - 20} y1="80" x2={svgWidth - 20} y2="160" stroke="#0f172a" strokeWidth="3.5" />

          {/* Clef Glyphs */}
          {clef === 'treble' ? (
            <text
              x="32"
              y="156"
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
              y="142"
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
            <text x="0" y="115" fontSize="28" fontFamily="serif" fontWeight="700" fill="#0f172a" textAnchor="middle">
              {timeSignature[0]}
            </text>
            <text x="0" y="155" fontSize="28" fontFamily="serif" fontWeight="700" fill="#0f172a" textAnchor="middle">
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
                y1="80"
                x2={barX}
                y2="160"
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
              noteColor = '#059669'; // Emerald
              labelColor = '#059669';
            } else if (isTarget) {
              noteColor = lastMismatch ? '#dc2626' : '#d97706'; // Red or Amber
              labelColor = lastMismatch ? '#dc2626' : '#b45309';

              halo = (
                <circle
                  cx={x}
                  cy={y}
                  r="20"
                  fill={lastMismatch ? '#fee2e2' : '#fef3c7'}
                  opacity="0.85"
                />
              );
            }

            const stemUp = y > centerY;
            const stemX = stemUp ? x + 9.5 : x - 9.5;
            const stemY2 = stemUp ? y - 44 : y + 44;

            const beats = getNoteDurationBeats(note.duration);
            const beatText = beats === 0.5 ? '½t' : `${beats}t`;

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
                  y={238}
                  textAnchor="middle"
                  fontSize={isTarget ? '15' : '13'}
                  fontWeight={isTarget ? '700' : '500'}
                  fill={labelColor}
                  className="font-sans select-none"
                >
                  {note.solfegePitch}
                </text>

                {/* Subtle Rhythm Duration Beat Indicator */}
                <text
                  x={x}
                  y={254}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="500"
                  fill={isTarget ? labelColor : '#94a3b8'}
                  className="font-mono select-none"
                >
                  {beatText}
                </text>

                {/* Fingering hint */}
                {note.finger && (
                  <text
                    x={x}
                    y={20}
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
