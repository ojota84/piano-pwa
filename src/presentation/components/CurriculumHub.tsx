import React, { useState } from 'react';
import {
  Music,
  Award,
  BookOpen,
  Sparkles,
  Smartphone,
  ChevronRight,
  CheckCircle2,
  Clock,
  Play,
  Layers,
} from 'lucide-react';
import { PartitionPiece, TrainingCategory } from '../../core/models/music.types.ts';
import { ProgressStorage, LevelProgress } from '../../infrastructure/storage/ProgressStorage.ts';

interface CurriculumHubProps {
  levels: PartitionPiece[];
  onSelectLevel: (level: PartitionPiece) => void;
  onOpenGuide: () => void;
}

interface CategoryMeta {
  id: TrainingCategory | 'all';
  label: string;
  icon: React.ReactNode;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'all',
    label: 'Tous les Niveaux',
    icon: <Layers className="w-4 h-4" />,
    description: 'Parcours complet d’apprentissage du Solfège au piano',
  },
  {
    id: 'landmarks',
    label: 'Repères (5 Doigts)',
    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    description: 'Ancrage du Do central, repérage spatial et position fixe',
  },
  {
    id: 'bass_clef',
    label: 'Clé de Fa',
    icon: <BookOpen className="w-4 h-4 text-sky-400" />,
    description: 'Déchiffrage de la main gauche dans le registre grave',
  },
  {
    id: 'intervals',
    label: 'Intervalles & Sauts',
    icon: <Music className="w-4 h-4 text-indigo-400" />,
    description: 'Lecture en tierces, quartes, quintes et octave complète',
  },
  {
    id: 'repertoire',
    label: 'Répertoire Réel',
    icon: <Award className="w-4 h-4 text-emerald-400" />,
    description: 'Beethoven, Satie, airs traditionnels et thèmes intemporels',
  },
];

export const CurriculumHub: React.FC<CurriculumHubProps> = ({
  levels,
  onSelectLevel,
  onOpenGuide,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory | 'all'>('all');
  const progressMap = ProgressStorage.getProgress();

  const filteredLevels = selectedCategory === 'all'
    ? levels
    : levels.filter((l) => l.category === selectedCategory);

  const completedCount = levels.filter((l) => progressMap[l.id]?.completed).length;
  const progressPercent = Math.round((completedCount / levels.length) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-3.5 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Music className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Cadence</span>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Conservatoire
                </span>
              </div>
              <p className="text-xs text-slate-400">Méthode de Solfège interactif pour piano acoustique</p>
            </div>
          </div>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Guide du pupitre</span>
          </button>
        </div>
      </header>

      {/* Main Catalog View */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Curriculum Banner & Overall Progress */}
        <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Votre Programme d’Entraînement</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Choisissez votre niveau de pratique
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Posez votre téléphone sur le pupitre de votre piano. L’application écoute vos notes réelles avec Solfège fixe et fait défiler la partition sans toucher l’écran.
            </p>
          </div>

          {/* Progress Card */}
          <div className="w-full md:w-auto bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 min-w-[240px] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Progression globale</span>
              <span className="font-mono font-bold text-amber-400">
                {completedCount} / {levels.length} validés
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>{progressPercent}% complété</span>
              <span className="text-emerald-400 font-semibold">14 Niveaux disponibles</span>
            </div>
          </div>
        </section>

        {/* Category Navigation Pills */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = cat.id === 'all'
                ? levels.length
                : levels.filter((l) => l.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 px-1">
            {CATEGORIES.find((c) => c.id === selectedCategory)?.description}
          </p>
        </section>

        {/* Levels Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
          {filteredLevels.map((piece) => {
            const prog: LevelProgress | undefined = progressMap[piece.id];
            const isCompleted = prog?.completed ?? false;

            return (
              <div
                key={piece.id}
                onClick={() => onSelectLevel(piece)}
                className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/50 hover:bg-slate-900 transition-all duration-200 p-5 flex flex-col justify-between gap-4 cursor-pointer shadow-lg hover:shadow-amber-500/5"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-extrabold flex items-center justify-center">
                        {piece.levelNumber}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {piece.category === 'landmarks' && 'Repères & Doigtés'}
                        {piece.category === 'bass_clef' && 'Clé de Fa'}
                        {piece.category === 'intervals' && 'Intervalles'}
                        {piece.category === 'repertoire' && (piece.composer || 'Répertoire')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide bg-slate-800 text-amber-300 px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1 font-serif">
                        <span>{piece.clef === 'treble' ? '𝄞' : '𝄢'}</span>
                        <span className="font-sans">Clé de {piece.clef === 'treble' ? 'Sol' : 'Fa'}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          piece.difficulty === 'Débutant'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : piece.difficulty === 'Élémentaire'
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {piece.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors tracking-tight">
                    {piece.title}
                  </h3>
                  {piece.subtitle && (
                    <div className="text-xs text-amber-400/90 font-medium mt-0.5">
                      {piece.subtitle}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {piece.description}
                  </p>
                </div>

                {/* Card Footer: Metadata & Action CTA */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                    <span className="flex items-center gap-1">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span>{piece.notes.length} notes</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>~{piece.estimatedMinutes || 3} min</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{prog.bestAccuracy}%</span>
                      </div>
                    ) : null}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLevel(piece);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>S’entraîner</span>
                      <ChevronRight className="w-3.5 h-3.5 -ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};
