import React, { useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { PartitionPiece, TrainingCategory } from '../../core/models/music.types.ts';
import { ProgressStorage } from '../../infrastructure/storage/ProgressStorage.ts';

interface CurriculumHubProps {
  levels: PartitionPiece[];
  onSelectLevel: (level: PartitionPiece) => void;
  onOpenGuide: () => void;
}

type FilterOption = 'all' | 'treble' | 'bass' | TrainingCategory;

const FILTERS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'treble', label: '𝄞 Clé de Sol' },
  { id: 'bass', label: '𝄢 Clé de Fa' },
  { id: 'landmarks', label: 'Repères' },
  { id: 'intervals', label: 'Intervalles' },
  { id: 'repertoire', label: 'Répertoire' },
];

export const CurriculumHub: React.FC<CurriculumHubProps> = ({
  levels,
  onSelectLevel,
  onOpenGuide,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const progressMap = ProgressStorage.getProgress();

  const filteredLevels = levels.filter((piece) => {
    const matchesFilter =
      activeFilter === 'all'
        ? true
        : activeFilter === 'treble'
        ? piece.clef === 'treble'
        : activeFilter === 'bass'
        ? piece.clef === 'bass'
        : piece.category === activeFilter;

    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      query === '' ||
      piece.title.toLowerCase().includes(query) ||
      (piece.composer && piece.composer.toLowerCase().includes(query)) ||
      String(piece.levelNumber).includes(query);

    return matchesFilter && matchesQuery;
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

      {/* Compact Filter & Lesson List */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
        {/* Compact Search & Clef/Category Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-900">
          {/* Clean Unboxed Filter Tabs */}
          <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`text-xs whitespace-nowrap transition-colors cursor-pointer pb-1 ${
                    isActive
                      ? 'text-amber-400 font-semibold border-b border-amber-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </nav>

          {/* Compact Minimal Search Input */}
          <div className="relative flex items-center sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-0 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par titre..."
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
                  {/* Left: Done status + Level Number + Title */}
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

                  {/* Right: Clear Clef Indicator (Clé de Sol / Clé de Fa) */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs flex items-center gap-1.5 ${
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
