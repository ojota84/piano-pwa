import { MusicalNote } from './music.types.ts';

export interface PitchResult {
  readonly frequency: number;
  readonly solfegeName: string; // "Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"
  readonly octave: number;
  readonly midi: number;
  readonly cents: number;
  readonly confidence: number;
  readonly rms: number;
  readonly isPitched: boolean;
  readonly audioState?: string;
  readonly sampleRate?: number;
  readonly debugMessage?: string;
}

export type EvaluationStatus = 'MATCH' | 'MISMATCH' | 'IGNORED';

export type RhythmStatus = 'on_time' | 'early' | 'late';

export type GradeLabel = 'Excellent' | 'Très bien' | 'Bien' | 'À retravailler';

export interface NotePerformanceRecord {
  readonly noteIndex: number;
  readonly noteId: string;
  readonly solfegePitch: string;
  readonly pitchCorrectFirstTry: boolean;
  readonly wrongAttemptsOnNote: number;
  readonly rhythmStatus: RhythmStatus;
  readonly expectedIntervalMs: number;
  readonly actualIntervalMs: number;
}

export interface LevelGradeSummary {
  readonly totalNotes: number;
  readonly correctPitchNotesCount: number;
  readonly onTimeRhythmNotesCount: number;
  readonly pitchScorePercent: number;
  readonly rhythmScorePercent: number;
  readonly overallScorePercent: number;
  readonly gradeLabel: GradeLabel;
  readonly noteRecords: readonly NotePerformanceRecord[];
}

export interface EvaluationResult {
  readonly status: EvaluationStatus;
  readonly targetNote?: MusicalNote;
  readonly detectedPitch?: PitchResult;
  readonly noteRecord?: NotePerformanceRecord;
  readonly message?: string;
}
