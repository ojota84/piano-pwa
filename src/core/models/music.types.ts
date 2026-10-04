export type ClefType = 'treble' | 'bass';

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth';

export type SolfegeStep = 'Do' | 'Ré' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si';

export type TrainingCategory = 'landmarks' | 'bass_clef' | 'intervals' | 'repertoire';

export type DifficultyLevel = 'Débutant' | 'Intermédiaire' | 'Avancé';

export type LessonMode = 'lecture' | 'rythme';

export interface MusicalNote {
  readonly id: string;
  readonly solfegePitch: string; // e.g. "Do 4", "La 3", "Do 6"
  readonly midi: number;         // 60 = Do 4, 57 = La 3, 84 = Do 6
  readonly step: SolfegeStep;
  readonly octave: number;
  readonly accidental?: '#' | 'b' | 'n';
  readonly duration: NoteDuration;
  readonly finger?: number;      // 1 = thumb, 5 = pinky
}

export interface PartitionPiece {
  readonly id: string;
  readonly category: TrainingCategory;
  readonly mode?: LessonMode;    // 'lecture' (notes only) or 'rythme' (notes + tempo timing)
  readonly levelNumber: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly composer?: string;
  readonly difficulty: DifficultyLevel;
  readonly rangeLabel?: string;  // e.g. "La 3 – Do 6"
  readonly clef: ClefType;
  readonly keySignature: string; // 'Do', 'Sol', 'Fa'
  readonly timeSignature: readonly [number, number]; // [4, 4]
  readonly tempo: number;        // BPM
  readonly description: string;
  readonly notes: readonly MusicalNote[];
  readonly learningFocus: string;
  readonly estimatedMinutes?: number;
}
