export type ClefType = 'treble' | 'bass';

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth';

export type SolfegeStep = 'Do' | 'Ré' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si';

export interface MusicalNote {
  id: string;
  solfegePitch: string; // e.g. "Do 4", "Ré 4", "Mi 4"
  midi: number;          // 60 = Do 4
  step: SolfegeStep;
  octave: number;
  accidental?: '#' | 'b' | 'n';
  duration: NoteDuration;
  finger?: number;       // 1 = thumb, 5 = pinky
}

export interface PartitionPiece {
  id: string;
  title: string;
  composer?: string;
  difficulty: 'Débutant' | 'Élémentaire' | 'Intermédiaire';
  clef: ClefType;
  keySignature: string; // 'Do', 'Sol', 'Fa'
  timeSignature: [number, number]; // [4, 4]
  tempo: number; // BPM
  description: string;
  notes: MusicalNote[];
  learningFocus: string;
}
