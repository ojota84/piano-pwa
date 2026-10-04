import { MusicalNote } from './music.types.ts';

export interface PitchResult {
  frequency: number;
  solfegeName: string; // "Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"
  octave: number;
  midi: number;
  cents: number;
  confidence: number;
  rms: number;
  isPitched: boolean;
  audioState?: string;
  sampleRate?: number;
  debugMessage?: string;
}

export type EvaluationStatus = 'MATCH' | 'MISMATCH' | 'IGNORED';

export type RhythmStatus = 'on_time' | 'early' | 'late';

export interface NotePerformanceRecord {
  noteIndex: number;
  noteId: string;
  solfegePitch: string;
  pitchCorrectFirstTry: boolean;
  wrongAttemptsOnNote: number;
  rhythmStatus: RhythmStatus;
  expectedIntervalMs: number;
  actualIntervalMs: number;
}

export interface LevelGradeSummary {
  totalNotes: number;
  correctPitchNotesCount: number;
  onTimeRhythmNotesCount: number;
  pitchScorePercent: number;
  rhythmScorePercent: number;
  overallScorePercent: number;
  gradeLabel: 'Excellent' | 'Très bien' | 'Bien' | 'À retravailler';
  noteRecords: NotePerformanceRecord[];
}

export interface EvaluationResult {
  status: EvaluationStatus;
  targetNote?: MusicalNote;
  detectedPitch?: PitchResult;
  noteRecord?: NotePerformanceRecord;
  message?: string;
}
