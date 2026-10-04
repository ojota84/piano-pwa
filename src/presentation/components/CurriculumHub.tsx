import React, { useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { PartitionPiece, DifficultyLevel, ClefType } from '../../core/models/music.types.ts';
import { ProgressStorage } from '../../infrastructure/storage/ProgressStorage.ts';

interface CurriculumHubProps {
  levels: PartitionPiece[];
  onSelectLevel: (level: PartitionPiece) => void;
  onOpenGuide: () => void;
}

type LevelTab = 'all' | DifficultyLevel;
type ClefFilter = 'all' | ClefType;

const LEVEL_TABS: { id: LevelTab; label: string }[] = [
  { id: 'all', label: 'Tous les niveaux' },
  { id: 'Débutant', label: 'Débutant' },
  { id: 'Intermédiaire', label: 'Intermédiaire' },
  { id: 'Avancé', label: 'Avancé' },
];

export const CurriculumHub: React.FC<CurriculumHubProps> = ({
  levels,
  onSelectLevel,
  onOpenGuide,
}) => {
  const [selectedLevelTab, setSelectedLevelTab] = useState<LevelTab>('all');
  const [selectedClef, setSelectedClef] = useState<ClefFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const progressMap = ProgressStorage.getProgress();

  const filteredLevels = levels.filter((piece) => {
    const matchesLevel =
      selectedLevelTab === 'all' ? true : piece.difficulty === selectedLevelTab;
    const matchesClef =
      selectedClef === 'all' ? true : piece.clef === selectedClef;

    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      query === '' ||
      piece.title.toLowerCase().includes(query) ||
      (piece.rangeLabel && piece.rangeLabel.toLowerCase().includes(query)) ||
      String(piece.levelNumber).includes(query);

    return matchesLevel && matchesClef && matchesQuery;
  });

  const completedCount = levels.filter((l) => progressMap[l.id]?.completed).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/20">
      {/* Minimalist Top Bar */}
      <header className="border-b border-slate-900 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-base tracking-tight text-slate-100">
            Cadence
          </span>

          <div className="flex items-center gap-5 text-xs text-slate-400">
            <span className="tabular-nums">
              {completedCount}/{levels.length} terminés
            </span>
            <button
              onClick={onOpenGuide}
              className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              Guide
            </button>
          </div>
        </div>
      </header>

      {/* Compact Level Tabs & Lesson List */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3">
        {/* Primary Level Tabs + Clef Toggle + Compact Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-900">
          {/* Level Tabs (Tous / Débutant / Intermédiaire / Avancé) */}
          <nav className="flex items-center gap-5 overflow-x-auto no-scrollbar py-1" aria-label="Niveaux">
            {LEVEL_TABS.map((tab) => {
              const isActive = selectedLevelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedLevelTab(tab.id)}
                  className={`text-xs whitespace-nowrap transition-colors cursor-pointer pb-1 ${
                    isActive
                      ? 'text-amber-400 font-semibold border-b border-amber-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right side: Clef Filter + Search Input */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 text-xs">
              <button
                onClick={() => setSelectedClef(selectedClef === 'treble' ? 'all' : 'treble')}
                className={`cursor-pointer transition-colors ${
                  selectedClef === 'treble'
                    ? 'text-amber-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                𝄞 Sol
              </button>
              <span className="text-slate-800">·</span>
              <button
                onClick={() => setSelectedClef(selectedClef === 'bass' ? 'all' : 'bass')}
                className={`cursor-pointer transition-colors ${
                  selectedClef === 'bass'
                    ? 'text-sky-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                𝄢 Fa
              </button>
            </div>

            <div className="relative flex items-center w-36 sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-0 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-transparent pl-5 pr-5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none border-b border-transparent focus:border-slate-700 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-0 text-slate-500 hover:text-slate-300"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Minimalist Single-Line Lesson List */}
        <div className="divide-y divide-slate-900">
          {filteredLevels.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              Aucune leçon trouvée.
            </p>
          ) : (
            filteredLevels.map((piece) => {
              const isDone = progressMap[piece.id]?.completed ?? false;
              const isTreble = piece.clef === 'treble';

              return (
                <button
                  key={piece.id}
                  onClick={() => onSelectLevel(piece)}
                  className="w-full py-3 px-1 flex items-center justify-between gap-4 text-left hover:bg-slate-900/50 transition-colors group cursor-pointer"
                >
                  {/* Left: Done status + Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-5 flex items-center justify-center shrink-0"
                      title={isDone ? 'Déjà effectué' : 'À faire'}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                      ) : (
                        <span className="text-xs font-mono tabular-nums text-slate-600">
                          {String(piece.levelNumber).padStart(2, '0')}
                        </span>
                      )}
                    </span>

                    <span
                      className={`text-sm sm:text-base truncate transition-colors ${
                        isDone
                          ? 'text-slate-300 group-hover:text-white'
                          : 'text-slate-100 font-medium group-hover:text-amber-300'
                      }`}
                    >
                      {piece.title}
                    </span>
                  </div>

                  {/* Right: Level label + Clear Clef Indicator (Clé de Sol / Clé de Fa) */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="hidden sm:inline text-xs text-slate-500">
                      {piece.difficulty}
                    </span>

                    <span
                      className={`text-xs flex items-center gap-1.5 w-24 justify-end ${
                        isTreble ? 'text-amber-400/90' : 'text-sky-400/90'
                      }`}
                    >
                      <span className="font-serif text-base leading-none">
                        {isTreble ? '𝄞' : '𝄢'}
                      </span>
                      <span>Clé de {isTreble ? 'Sol' : 'Fa'}</span>
                    </span>

                    <span className="text-slate-600 group-hover:text-slate-300 text-xs transition-colors">
                      →
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
