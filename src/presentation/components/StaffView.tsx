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
  const svgHeight = 230;

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

    // Immediate center + RAF for mobile rendering stability
    centerActiveNote();
    const rafId = requestAnimationFrame(centerActiveNote);
    window.addEventListener('resize', centerActiveNote);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', centerActiveNote);
    };
  }, [currentIndex, notes.length, svgWidth]);

  return (
    <div className="relative w-full rounded-2xl bg-white shadow-xl border border-slate-200 select-none overflow-hidden">
      {/* Pinned Clef Badge for Mobile (stays visible even when scrolled far right) */}
      <div className="absolute top-2.5 left-3 z-10 bg-slate-900/90 text-white backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-md border border-slate-700 flex items-center gap-1.5 pointer-events-none">
        <span className="text-amber-400 font-serif text-sm">
          {clef === 'treble' ? '𝄞' : '𝄢'}
        </span>
        <span>Clé de {clef === 'treble' ? 'Sol' : 'Fa'}</span>
      </div>

      {/* Auto-Centering Scroll Container */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto p-4 scroll-smooth scrollbar-thin scrollbar-thumb-slate-300"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-56"
          style={{ minWidth: `${svgWidth}px` }}
        >
        {/* Background */}
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
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}

        {/* Start Bar Line & Final Double Bar Line */}
        <line x1="20" y1="50" x2="20" y2="130" stroke="#0f172a" strokeWidth="3" />
        <line x1={svgWidth - 25} y1="50" x2={svgWidth - 25} y2="130" stroke="#0f172a" strokeWidth="2" />
        <line x1={svgWidth - 20} y1="50" x2={svgWidth - 20} y2="130" stroke="#0f172a" strokeWidth="4" />

        {/* Clef Glyphs */}
        {clef === 'treble' ? (
          <g>
            <text
              x="32"
              y="126"
              fontFamily="serif"
              fontSize="86"
              fill="#0f172a"
              fontWeight="bold"
              className="select-none"
            >
              𝄞
            </text>
            <text x="82" y="146" fontSize="10" fill="#64748b" fontWeight="bold">
              Clé de Sol
            </text>
          </g>
        ) : (
          <g>
            <text
              x="30"
              y="112"
              fontFamily="serif"
              fontSize="68"
              fill="#0f172a"
              fontWeight="bold"
              className="select-none"
            >
              𝄢
            </text>
            <text x="82" y="146" fontSize="10" fill="#64748b" fontWeight="bold">
              Clé de Fa
            </text>
          </g>
        )}

        {/* Time Signature 4/4 */}
        <g transform="translate(100, 0)">
          <text x="0" y="85" fontSize="30" fontFamily="serif" fontWeight="900" fill="#0f172a" textAnchor="middle">
            4
          </text>
          <text x="0" y="125" fontSize="30" fontFamily="serif" fontWeight="900" fill="#0f172a" textAnchor="middle">
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

          // Ledger lines calculation
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

          // Colors
          let noteColor = '#1e293b';
          let labelColor = '#475569';
          let halo = null;

          if (isCompleted) {
            noteColor = '#059669'; // Emerald
            labelColor = '#059669';
          } else if (isTarget) {
            noteColor = lastMismatch ? '#dc2626' : '#d97706'; // Red or Amber
            labelColor = lastMismatch ? '#dc2626' : '#b45309';

            halo = (
              <g>
                <circle
                  cx={x}
                  cy={y}
                  r="24"
                  fill={lastMismatch ? '#fee2e2' : '#fef3c7'}
                  opacity="0.8"
                >
                  <animate
                    attributeName="r"
                    values="22;27;22"
                    dur="1.3s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0.3;0.8"
                    dur="1.3s"
                    repeatCount="indefinite"
                  />
                </circle>
                <polygon
                  points={`${x},${y + 26} ${x - 6},${y + 36} ${x + 6},${y + 36}`}
                  fill={lastMismatch ? '#dc2626' : '#d97706'}
                />
              </g>
            );
          }

          // Stem orientation: stem down if y <= 90, else stem up
          const stemUp = y > 90;
          const stemX = stemUp ? x + 9.5 : x - 9.5;
          const stemY2 = stemUp ? y - 48 : y + 48;

          return (
            <g key={note.id} className="transition-all duration-150">
              {halo}

              {/* Ledger Lines Below Staff */}
              {ledgerLinesBelow.map((ly, lIdx) => (
                <line
                  key={`ledger-below-${lIdx}`}
                  x1={x - 18}
                  y1={ly}
                  x2={x + 18}
                  y2={ly}
                  stroke={noteColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              ))}

              {/* Ledger Lines Above Staff */}
              {ledgerLinesAbove.map((ly, lIdx) => (
                <line
                  key={`ledger-above-${lIdx}`}
                  x1={x - 18}
                  y1={ly}
                  x2={x + 18}
                  y2={ly}
                  stroke={noteColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
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
                  strokeWidth="2.6"
                />
              )}

              {/* Notehead */}
              <ellipse
                cx={x}
                cy={y}
                rx="11"
                ry="8.5"
                transform={`rotate(-25 ${x} ${y})`}
                fill={note.duration === 'half' || note.duration === 'whole' ? '#ffffff' : noteColor}
                stroke={noteColor}
                strokeWidth="2.8"
              />

              {/* Solfège Pitch Label */}
              <text
                x={x}
                y={196}
                textAnchor="middle"
                fontSize={isTarget ? '16' : '14'}
                fontWeight={isTarget ? '900' : '700'}
                fill={labelColor}
                className="font-sans select-none"
              >
                {note.solfegePitch}
              </text>

              {/* Fingering hint */}
              {note.finger && (
                <g>
                  <circle
                    cx={x}
                    cy={24}
                    r="9"
                    fill={isTarget ? '#fef3c7' : '#f8fafc'}
                    stroke={isTarget ? '#d97706' : '#cbd5e1'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={28}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={isTarget ? '#92400e' : '#475569'}
                  >
                    {note.finger}
                  </text>
                </g>
              )}

              {/* Completed checkmark */}
              {isCompleted && (
                <text x={x} y={170} textAnchor="middle" fontSize="13" fill="#059669" fontWeight="bold">
                  ✓
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
