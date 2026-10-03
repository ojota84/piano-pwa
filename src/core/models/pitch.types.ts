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

export interface EvaluationResult {
  status: EvaluationStatus;
  targetNote?: MusicalNote;
  detectedPitch?: PitchResult;
  message?: string;
}
