import React, { useRef, useEffect } from 'react';
import { MusicalNote, ClefType } from '../../core/models/music.types.ts';
import { getDiatonicStaffPosition } from '../../core/theory/musicTheory.ts';

export interface StaffViewProps {
  notes: MusicalNote[];
  currentIndex: number;
  clef: ClefType;
  lastMismatch: boolean;
}

export const StaffView: React.FC<StaffViewProps> = ({
  notes,
  currentIndex,
  clef,
  lastMismatch,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 5 Staff Lines:
  // Line 5 (Top): y = 50
  // Line 4: y = 70
  // Line 3 (Middle): y = 90 (staffPosition = 0)
  // Line 2: y = 110
  // Line 1 (Bottom): y = 130
  const staffLineY = [50, 70, 90, 110, 130];
  const stepHeight = 10; // 10px per diatonic step

  const startX = 135;
  const noteSpacing = 72;
  const svgWidth = Math.max(540, startX + notes.length * noteSpacing + 60);
  const svgHeight = 220;

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
          className="w-full h-48 sm:h-52"
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
          <line x1="20" y1="50" x2="20" y2="130" stroke="#0f172a" strokeWidth="2.5" />
          <line x1={svgWidth - 25} y1="50" x2={svgWidth - 25} y2="130" stroke="#0f172a" strokeWidth="1.5" />
          <line x1={svgWidth - 20} y1="50" x2={svgWidth - 20} y2="130" stroke="#0f172a" strokeWidth="3.5" />

          {/* Clef Glyphs */}
          {clef === 'treble' ? (
            <g>
              <text
                x="32"
                y="126"
                fontFamily="serif"
                fontSize="84"
                fill="#0f172a"
                className="select-none"
              >
                𝄞
              </text>
            </g>
          ) : (
            <g>
              <text
                x="30"
                y="112"
                fontFamily="serif"
                fontSize="66"
                fill="#0f172a"
                className="select-none"
              >
                𝄢
              </text>
            </g>
          )}

          {/* Time Signature 4/4 */}
          <g transform="translate(95, 0)">
            <text x="0" y="85" fontSize="28" fontFamily="serif" fontWeight="700" fill="#0f172a" textAnchor="middle">
              4
            </text>
            <text x="0" y="125" fontSize="28" fontFamily="serif" fontWeight="700" fill="#0f172a" textAnchor="middle">
              4
            </text>
          </g>

          {/* Notes on the Pentagram */}
          {notes.map((note, index) => {
            const staffPos = getDiatonicStaffPosition(note.step, note.octave, clef);
            const x = startX + index * noteSpacing;
            const y = 90 - staffPos * stepHeight;

            const isTarget = index === currentIndex;
            const isCompleted = index < currentIndex;

            const ledgerLinesBelow: number[] = [];
            if (staffPos <= -6) {
              for (let p = -6; p >= staffPos; p -= 2) {
                ledgerLinesBelow.push(90 - p * stepHeight);
              }
              if (staffPos % 2 !== 0 && !ledgerLinesBelow.includes(90 - (staffPos + 1) * stepHeight)) {
                ledgerLinesBelow.push(90 - (staffPos + 1) * stepHeight);
              }
            }

            const ledgerLinesAbove: number[] = [];
            if (staffPos >= 6) {
              for (let p = 6; p <= staffPos; p += 2) {
                ledgerLinesAbove.push(90 - p * stepHeight);
              }
              if (staffPos % 2 !== 0 && !ledgerLinesAbove.includes(90 - (staffPos - 1) * stepHeight)) {
                ledgerLinesAbove.push(90 - (staffPos - 1) * stepHeight);
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

            const stemUp = y > 90;
            const stemX = stemUp ? x + 9.5 : x - 9.5;
            const stemY2 = stemUp ? y - 46 : y + 46;

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
                  y={192}
                  textAnchor="middle"
                  fontSize={isTarget ? '15' : '13'}
                  fontWeight={isTarget ? '700' : '500'}
                  fill={labelColor}
                  className="font-sans select-none"
                >
                  {note.solfegePitch}
                </text>

                {/* Fingering hint */}
                {note.finger && (
                  <text
                    x={x}
                    y={28}
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
