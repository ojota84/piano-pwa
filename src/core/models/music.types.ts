export type ClefType = 'treble' | 'bass';

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth';

export type SolfegeStep = 'Do' | 'Ré' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si';

export type TrainingCategory = 'landmarks' | 'bass_clef' | 'intervals' | 'repertoire';

export type DifficultyLevel = 'Débutant' | 'Intermédiaire' | 'Avancé';

export interface MusicalNote {
  id: string;
  solfegePitch: string; // e.g. "Do 4", "La 3", "Do 6"
  midi: number;          // 60 = Do 4, 57 = La 3, 84 = Do 6
  step: SolfegeStep;
  octave: number;
  accidental?: '#' | 'b' | 'n';
  duration: NoteDuration;
  finger?: number;       // 1 = thumb, 5 = pinky
}

export interface PartitionPiece {
  id: string;
  category: TrainingCategory;
  levelNumber: number;
  title: string;
  subtitle?: string;
  composer?: string;
  difficulty: DifficultyLevel;
  rangeLabel?: string; // e.g. "La 3 – Do 6"
  clef: ClefType;
  keySignature: string; // 'Do', 'Sol', 'Fa'
  timeSignature: [number, number]; // [4, 4]
  tempo: number; // BPM
  description: string;
  notes: MusicalNote[];
  learningFocus: string;
  estimatedMinutes?: number;
}
