import { ClefType, MusicalNote, NoteDuration, SolfegeStep } from '../models/music.types.ts';

export const SOLFEGE_STEPS: SolfegeStep[] = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

export const CHROMATIC_SOLFEGE = [
  'Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'
];

/**
 * Calculates diatonic staff step relative to the middle line (Line 3).
 * In Treble Clef: Line 3 is Si 4 (staffPosition = 0).
 * In Bass Clef: Line 3 is Ré 3 (staffPosition = 0).
 */
export function getDiatonicStaffPosition(
  step: SolfegeStep,
  octave: number,
  clef: ClefType
): number {
  const stepIndex = SOLFEGE_STEPS.indexOf(step);
  const diatonicRank = octave * 7 + (stepIndex >= 0 ? stepIndex : 0);

  if (clef === 'treble') {
    // Si 4 is Line 3: 4 * 7 + 6 = 34
    return diatonicRank - 34;
  } else {
    // Ré 3 is Line 3: 3 * 7 + 1 = 22
    return diatonicRank - 22;
  }
}

/**
 * Converts a frequency in Hz to MIDI number and Fixed-Do Solfège pitch representation.
 */
export function frequencyToMidiAndSolfege(frequency: number): {
  midi: number;
  solfegeName: string;
  octave: number;
  cents: number;
} {
  const midiFraction = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(midiFraction);
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = ((midi % 12) + 12) % 12;
  const solfegeName = CHROMATIC_SOLFEGE[noteIndex];

  const idealFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const cents = Math.round(1200 * Math.log2(frequency / idealFreq));

  return {
    midi,
    solfegeName,
    octave,
    cents,
  };
}

/**
 * Returns the number of quarter-note beats for a given NoteDuration.
 */
export function getNoteDurationBeats(duration: NoteDuration): number {
  switch (duration) {
    case 'whole':
      return 4;
    case 'half':
      return 2;
    case 'quarter':
      return 1;
    case 'eighth':
      return 0.5;
  }
}

/**
 * Returns the French Solfège rhythm label for a NoteDuration.
 */
export function getNoteDurationLabel(duration: NoteDuration): string {
  switch (duration) {
    case 'whole':
      return 'Ronde · 4 temps';
    case 'half':
      return 'Blanche · 2 temps';
    case 'quarter':
      return 'Noire · 1 temps';
    case 'eighth':
      return 'Croche · ½ temps';
  }
}

/**
 * Computes the target duration in milliseconds for a note at a given tempo (BPM).
 */
export function getNoteTargetDurationMs(duration: NoteDuration, tempoBpm: number): number {
  const safeBpm = Math.max(20, Math.min(240, tempoBpm));
  const beatMs = 60000 / safeBpm;
  return Math.round(beatMs * getNoteDurationBeats(duration));
}

/**
 * Computes the note indices AFTER which a vertical measure bar line should be drawn,
 * given a sequence of notes and a time signature (e.g. [4, 4] or [3, 4]).
 * Excludes the final note index since the piece ends with a double bar line.
 */
export function computeMeasureBarLineIndices(
  notes: MusicalNote[],
  timeSignature: [number, number] = [4, 4]
): number[] {
  const beatsPerMeasure = timeSignature[0] * (4 / timeSignature[1]);
  const barIndices: number[] = [];
  let accumulatedBeats = 0;

  for (let i = 0; i < notes.length - 1; i++) {
    accumulatedBeats += getNoteDurationBeats(notes[i].duration);
    if (accumulatedBeats >= beatsPerMeasure - 1e-6) {
      barIndices.push(i);
      accumulatedBeats = 0;
    }
  }

  return barIndices;
}
